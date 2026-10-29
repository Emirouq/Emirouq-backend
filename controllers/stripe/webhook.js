const stripe = require("../../services/stripe/getStripe");
const { webhookSecret } = require("../../config/keys").stripe;
const StripeEvent = require("../../models/StripeEvent.model");
const {
  invoicePaid,
  customerSubscriptionUpdated,
  subscriptionCancelled,
  paymentIntent,
  paymentIntentFailed,
  paymentIntentPendingOrCanceled,
  invoicePaymentFailed,
  refundUpdated,
} = require("../../services/stripe/webhooksEvents");

/**
 * The event, proven to come from Stripe. With the endpoint's signing secret
 * the signature is checked; without it the event is fetched from Stripe by
 * id, so a forged request body is never used either way.
 */
const verifiedEvent = async (req) => {
  if (webhookSecret) {
    return stripe.webhooks.constructEvent(
      req.rawBody,
      req.headers["stripe-signature"],
      webhookSecret
    );
  }
  if (!req.body?.id) throw new Error("Missing event id");
  return stripe.events.retrieve(req.body.id);
};

const HANDLERS = {
  "customer.subscription.deleted": (data) => subscriptionCancelled(data),
  "subscription_schedule.canceled": (data) => subscriptionCancelled(data),
  "subscription_schedule.aborted": (data) => subscriptionCancelled(data),
  "customer.subscription.updated": (data) => customerSubscriptionUpdated(data),
  "invoice.paid": (data) => invoicePaid(data),
  "invoice.payment_failed": (data) => invoicePaymentFailed(data),
  "payment_intent.succeeded": (data) => paymentIntent(data),
  "payment_intent.payment_failed": (data) => paymentIntentFailed(data),
  "payment_intent.processing": (data) => paymentIntentPendingOrCanceled(data, "pending"),
  "payment_intent.canceled": (data) => paymentIntentPendingOrCanceled(data, "canceled"),
  "refund.created": (data) => refundUpdated(data),
  "refund.updated": (data) => refundUpdated(data),
  "charge.refunded": (data) => refundUpdated(data),
};

const webhook = async (req, res) => {
  let event;
  try {
    event = await verifiedEvent(req);
  } catch (error) {
    console.warn("Rejected Stripe webhook:", error?.message);
    return res.status(400).send("Invalid webhook");
  }

  const handler = HANDLERS[event.type];
  if (!handler) return res.sendStatus(200);

  // Each event once: Stripe retries and may deliver twice.
  if (await StripeEvent.exists({ eventId: event.id })) {
    return res.sendStatus(200);
  }

  try {
    await handler(event.data);
    await StripeEvent.create({ eventId: event.id, type: event.type }).catch(() => {});
    return res.sendStatus(200);
  } catch (error) {
    // Not marked as processed: answering 500 makes Stripe retry later.
    console.error(`Stripe webhook ${event.type} (${event.id}) failed:`, error);
    return res.sendStatus(500);
  }
};

module.exports = webhook;
