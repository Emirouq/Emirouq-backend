const { Schema, model, Types } = require("mongoose");

const userSubscriptionModelSchema = new Schema({
  uuid: {
    type: String,
    required: true,
    unique: true,
  },
  user: {
    type: String,
    ref: "User",
    required: true,
  },
  // this is the customer id in stripe
  customerId: {
    type: String,
    required: true,
  },
  // this is the total renew count
  renew_count: {
    type: Number,
    default: 0,
    required: false,
  },
  // this is the stripe subscription id
  subscriptionId: {
    type: String,
    required: true,
  },
  // subscription plan , we have to save the whole object
  // since if we change the plan in the future, we need to know
  // which plan the user subscribed to
  subscriptionPlan: {
    planId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },

  validTill: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "pending", "cancelled"],
    default: "active",
  },
  // this is the last fingerprint used to make a payment
  fingerPrint: {
    type: String,
    required: false,
  },
  // here's a list of all the fingerprints used to make a payment
  usedFingerPrints: [
    {
      type: String,
    },
  ],
  defaultPaymentMethod: {
    type: String,
    required: false,
  },
  //if the subscription is cancelled, this will be the date
  cancel_at: {
    type: Number,
    required: false,
  },
  canceled_at: {
    type: Number,
    required: false,
  },
  autoRenew: {
    type: Boolean,
    default: false,
  },
});

userSubscriptionModelSchema.index({ user: 1 });

const UserSubscription = model(
  "UserSubscription",
  userSubscriptionModelSchema,
  "userSubscriptions"
);

module.exports = UserSubscription;
