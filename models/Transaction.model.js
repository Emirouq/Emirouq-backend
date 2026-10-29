const { Schema, model } = require("mongoose");

/**
 * One payment attempt through Stripe: a plan purchase, a plan renewal or an
 * ad boost. Written by the Stripe webhooks (services/stripe/recordTransaction.js),
 * one row per invoice or payment intent, so webhook retries update instead of
 * duplicating.
 */
const TransactionSchema = new Schema(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
    },
    // subscription (first payment) | renewal | boost | other
    type: {
      type: String,
      enum: ["subscription", "renewal", "boost", "other"],
      default: "other",
    },
    customerId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    // Snapshot at payment time.
    user: {
      firstName: {
        type: String,
      },
      lastName: {
        type: String,
      },
      userHandle: {
        type: String,
      },
      email: {
        type: String,
      },
    },
    subTotal: {
      type: Number,
    },
    // Major units (AED, not fils).
    amount: {
      type: Number,
      required: true,
    },
    currency: { type: String, default: "aed" },
    paymentIntentId: {
      type: String,
      required: false,
    },
    // Stripe subscription id; empty for boosts.
    subscriptionId: {
      type: String,
      required: false,
    },
    userSubscriptionId: { type: String }, // our UserSubscription uuid
    planId: { type: String },
    planName: { type: String },
    categoryId: { type: String },
    postId: { type: String }, // boosted ad
    // succeeded | pending | failed | canceled | refunded | partially_refunded
    status: {
      type: String,
      required: true,
    },
    failureMessage: { type: String },
    paidAt: { type: Date },
    discount: [
      {
        type: Object,
      },
    ],
    invoiceId: {
      type: String,
    },
    invoiceNumber: {
      type: String,
    },
    invoicePdf: {
      type: String,
    },
    hostedUrl: {
      type: String,
    },
    receiptUrl: { type: String },
    tax: {
      type: Number,
    },
    defaultPaymentMethod: {
      type: String,
    },
    // e.g. { type: "card", brand: "visa", last4: "4242", wallet: "apple_pay" }
    paymentMethod: {
      type: { type: String },
      brand: { type: String },
      last4: { type: String },
      wallet: { type: String },
    },
    // Gateway reference: the Stripe charge id (ch_…).
    charge: {
      type: String,
    },
    refund: [
      {
        type: String,
      },
    ],
    refundedAmount: { type: Number, default: 0 },
    outcome: {
      type: Object,
    },
  },
  { timestamps: true }
);

TransactionSchema.index({ invoiceId: 1 }, { sparse: true });
TransactionSchema.index({ paymentIntentId: 1 }, { sparse: true });
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ subscriptionId: 1 });
TransactionSchema.index({ paidAt: -1 });

module.exports = model("Transaction", TransactionSchema, "transactions");
