const { Schema, model, Types } = require("mongoose");

const userSubscriptionModelSchema = new Schema({
  user: {
    type: String,
    ref: "User",
    required: true,
  },
  // subscription plan uuid
  plan: {
    type: String,
    ref: "Subscription",
    required: true,
  },

  validTill: {
    type: Date,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ["credit_card", "paypal", "bank_transfer", "stripe"],
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "pending", "cancelled"],
    default: "active",
  },
  autoRenew: {
    type: Boolean,
    default: false,
  },
  subscriptionId: {
    type: String,
    required: true,
  },
  priceId: {
    type: String,
    required: true,
  },
});

userSubscriptionModelSchema.index({ user: 1 });

const UserSubscription = model(
  "UserSubscription",
  userSubscriptionModelSchema,
  "userSubscriptions"
);

module.exports = UserSubscription;
