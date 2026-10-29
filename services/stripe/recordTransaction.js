const { v4: uuid } = require("uuid");
const stripe = require("./getStripe");
const Transaction = require("../../models/Transaction.model");

/**
 * Turns Stripe invoices and payment intents into Transaction rows for the
 * admin Subscription module. Works with the current Stripe API (2025 "basil",
 * where invoices list their payments under `invoice.payments`) and the older
 * shape (`invoice.payment_intent` / `invoice.charge`).
 *
 * Every function is best-effort: a failure is logged and never breaks the
 * webhook that called it.
 */

const toMajor = (minor) => (Number(minor) || 0) / 100;
const idOf = (value) => (typeof value === "string" ? value : value?.id);

const userSnapshot = (user) => ({
  firstName: user?.firstName,
  lastName: user?.lastName,
  userHandle: user?.userHandle,
  email: user?.email,
});

/** Payment-intent id behind an invoice, for either API shape. */
const paymentIntentIdFromInvoice = (invoice) => {
  const payment = invoice?.payments?.data?.find(
    (entry) => entry?.payment?.payment_intent
  );
  return idOf(payment?.payment?.payment_intent) || idOf(invoice?.payment_intent);
};

/** Charge, card and receipt details of a payment intent. */
const paymentDetails = async (paymentIntentId) => {
  if (!paymentIntentId) return {};
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });
  const charge = typeof intent?.latest_charge === "object" ? intent.latest_charge : null;
  const method = charge?.payment_method_details;
  const card = method?.card;
  return {
    paymentIntentId: intent?.id,
    charge: charge?.id || idOf(intent?.latest_charge),
    receiptUrl: charge?.receipt_url,
    paidAt: charge?.created ? new Date(charge.created * 1000) : undefined,
    defaultPaymentMethod: idOf(intent?.payment_method),
    paymentMethod: method
      ? {
          type: method.type,
          brand: card?.brand,
          last4: card?.last4,
          wallet: card?.wallet?.type,
        }
      : undefined,
    outcome: charge?.outcome,
    failureMessage: intent?.last_payment_error?.message,
  };
};

const upsert = (filter, fields) =>
  Transaction.findOneAndUpdate(
    filter,
    { $set: fields, $setOnInsert: { uuid: uuid() } },
    { upsert: true, new: true }
  );

/**
 * Records a subscription invoice (first payment or renewal).
 * @param {{ invoiceId: string, user: object, plan?: object,
 *           userSubscriptionId?: string, status: "succeeded"|"failed" }} args
 */
const recordInvoiceTransaction = async ({
  invoiceId,
  user,
  plan,
  userSubscriptionId,
  status,
}) => {
  try {
    if (!invoiceId || !user) return null;
    const invoice = await stripe.invoices.retrieve(invoiceId, {
      expand: ["payments"],
    });
    const details = await paymentDetails(paymentIntentIdFromInvoice(invoice)).catch(
      () => ({})
    );
    const subscriptionId =
      invoice?.parent?.subscription_details?.subscription || idOf(invoice?.subscription);

    return await upsert(
      { invoiceId: invoice.id },
      {
        type:
          invoice?.billing_reason === "subscription_cycle" ? "renewal" : "subscription",
        customerId: idOf(invoice.customer),
        userId: user.uuid,
        user: userSnapshot(user),
        amount: toMajor(status === "succeeded" ? invoice.amount_paid : invoice.amount_due),
        subTotal: toMajor(invoice.subtotal),
        tax: toMajor(invoice.tax ?? invoice.total_taxes?.[0]?.amount),
        currency: invoice.currency,
        discount: invoice.discounts || [],
        subscriptionId,
        ...(userSubscriptionId && { userSubscriptionId }),
        ...(plan && {
          planId: plan.uuid,
          planName: plan.name,
          categoryId: plan.categoryId,
        }),
        status,
        invoiceNumber: invoice.number,
        invoicePdf: invoice.invoice_pdf,
        hostedUrl: invoice.hosted_invoice_url,
        paidAt:
          details.paidAt ||
          (invoice.status_transitions?.paid_at
            ? new Date(invoice.status_transitions.paid_at * 1000)
            : undefined),
        ...details,
        ...(status === "failed" && {
          failureMessage: details.failureMessage || "Payment failed",
        }),
      }
    );
  } catch (error) {
    console.error("recordInvoiceTransaction failed:", error?.message || error);
    return null;
  }
};

/** Records a one-off payment (ad boost) made through a payment intent. */
const recordPaymentIntentTransaction = async ({ paymentIntentId, user, status }) => {
  try {
    if (!paymentIntentId || !user) return null;
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const details = await paymentDetails(paymentIntentId).catch(() => ({}));
    const metadata = intent?.metadata || {};
    return await upsert(
      { paymentIntentId },
      {
        type:
          metadata.purpose === "boost" || metadata.postId || metadata.isFeaturedAd
            ? "boost"
            : "other",
        customerId: idOf(intent.customer),
        userId: user.uuid,
        user: userSnapshot(user),
        amount: toMajor(intent.amount_received || intent.amount),
        currency: intent.currency,
        ...(metadata.postId && { postId: metadata.postId }),
        status,
        ...details,
        ...(status === "failed" && {
          failureMessage: details.failureMessage || "Payment failed",
        }),
      }
    );
  } catch (error) {
    console.error("recordPaymentIntentTransaction failed:", error?.message || error);
    return null;
  }
};

/** Applies a Stripe refund to the transaction it belongs to. */
const recordRefund = async (refund) => {
  try {
    if (!refund?.id) return null;
    const transaction = await Transaction.findOne({
      $or: [
        ...(refund.payment_intent ? [{ paymentIntentId: idOf(refund.payment_intent) }] : []),
        ...(refund.charge ? [{ charge: idOf(refund.charge) }] : []),
      ],
    });
    if (!transaction) return null;

    if (!transaction.refund.includes(refund.id)) transaction.refund.push(refund.id);
    // Sum every refund on the charge, so partial refunds add up correctly.
    const refunds = await stripe.refunds.list({
      ...(transaction.charge
        ? { charge: transaction.charge }
        : { payment_intent: transaction.paymentIntentId }),
      limit: 100,
    });
    const refunded = refunds.data
      .filter((item) => item.status === "succeeded")
      .reduce((sum, item) => sum + item.amount, 0);
    transaction.refundedAmount = toMajor(refunded);
    if (refunded > 0) {
      transaction.status =
        transaction.refundedAmount >= transaction.amount ? "refunded" : "partially_refunded";
    }
    await transaction.save();
    return transaction;
  } catch (error) {
    console.error("recordRefund failed:", error?.message || error);
    return null;
  }
};

module.exports = {
  recordInvoiceTransaction,
  recordPaymentIntentTransaction,
  recordRefund,
  paymentIntentIdFromInvoice,
};
