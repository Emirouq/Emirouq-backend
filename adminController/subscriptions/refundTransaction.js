const Joi = require("joi");
const httpErrors = require("http-errors");
const stripe = require("../../services/stripe/getStripe");
const Transaction = require("../../models/Transaction.model");
const UserSubscription = require("../../models/UserSubscription.model");
const Post = require("../../models/Post.model");
const { recordRefund } = require("../../services/stripe/recordTransaction");

const schema = Joi.object({
  // Major units (AED). Empty = refund what is left.
  amount: Joi.number().positive().precision(2),
  reason: Joi.string().valid("requested_by_customer", "duplicate", "fraudulent").default("requested_by_customer"),
  note: Joi.string().trim().max(500).allow(""),
  // Also end the plan now (subscriptions) / switch the boost off (boosts).
  revokeBenefit: Joi.boolean().default(true),
});

/**
 * POST /admin/api/subscriptions/transactions/:id/refund
 * Refunds through Stripe and records it. The refund webhook updates the
 * same transaction too; both paths are idempotent.
 */
const refundTransaction = async (req, res, next) => {
  try {
    const { value, error } = schema.validate(req.body, { stripUnknown: true });
    if (error) throw httpErrors.BadRequest(error.message);

    const tx = await Transaction.findOne({ uuid: req.params.id });
    if (!tx) throw httpErrors.NotFound("Transaction not found");
    if (!["succeeded", "partially_refunded"].includes(tx.status)) {
      throw httpErrors.BadRequest("Only paid transactions can be refunded.");
    }
    if (!tx.paymentIntentId && !tx.charge) {
      throw httpErrors.BadRequest("This transaction has no Stripe payment to refund.");
    }
    const remaining = Math.round((tx.amount - (tx.refundedAmount || 0)) * 100);
    const amount = value.amount ? Math.round(value.amount * 100) : remaining;
    if (amount <= 0 || amount > remaining) {
      throw httpErrors.BadRequest(`You can refund up to ${(remaining / 100).toFixed(2)}.`);
    }

    const refund = await stripe.refunds.create(
      {
        ...(tx.charge ? { charge: tx.charge } : { payment_intent: tx.paymentIntentId }),
        amount,
        reason: value.reason,
        metadata: { transactionId: tx.uuid, adminId: req.user.uuid, note: value.note || "" },
      },
      // Same request twice (double click) = one refund.
      { idempotencyKey: `refund-${tx.uuid}-${remaining}-${amount}` }
    );
    const updated = (await recordRefund(refund)) || tx;

    let revoked = null;
    if (value.revokeBenefit) {
      if (tx.type === "boost" && tx.postId) {
        await Post.updateOne(
          { uuid: tx.postId, "featuredAd.paymentIntentId": tx.paymentIntentId },
          { $set: { "featuredAd.isFeatured": false } }
        );
        revoked = "Boost switched off";
      } else if (tx.subscriptionId) {
        // Ends the plan now; the cancellation webhook expires its ads.
        await stripe.subscriptions.cancel(tx.subscriptionId).catch((err) => {
          if (err?.code !== "resource_missing") throw err;
        });
        await UserSubscription.updateOne(
          { subscriptionId: tx.subscriptionId },
          { $set: { status: "canceled", canceled_at: Math.floor(Date.now() / 1000) } }
        );
        revoked = "Plan cancelled";
      }
    }

    res.json({
      message: `Refund of ${(amount / 100).toFixed(2)} ${String(tx.currency || "aed").toUpperCase()} ${
        refund.status === "succeeded" ? "completed" : `is ${refund.status}`
      }${revoked ? `. ${revoked}.` : "."}`,
      data: { refundId: refund.id, refundStatus: refund.status, transaction: updated },
    });
  } catch (error) {
    if (error?.type?.startsWith?.("Stripe")) {
      return next(httpErrors.BadRequest(`Stripe: ${error.message}`));
    }
    next(error);
  }
};

module.exports = refundTransaction;
