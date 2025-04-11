const { Schema, model, Types } = require("mongoose");

const userSubscriptionModelSchema = new Schema({
  user: {
    type: String,
    ref: "User",
    required: true,
  },
  // subscription plan , we have to save the whole object
  // since if we change the plan in the future, we need to know
  // which plan the user subscribed to
  subscriptionPlan: {
    type: Object,
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
