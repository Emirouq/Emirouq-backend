const { Schema, model } = require("mongoose");

/**
 * Stripe webhook events already handled. Stripe delivers events at least
 * once (and retries), so each id is processed one time only.
 */
const StripeEventSchema = new Schema(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);
// Old entries are not needed forever.
StripeEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

module.exports = model("StripeEvent", StripeEventSchema, "stripeEvents");
