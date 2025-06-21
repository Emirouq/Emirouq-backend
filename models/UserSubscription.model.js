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
    name: {
      type: String,
      required: true,
      enum: ["Basic", "Starter", "Pro", "Elite", "Business"],
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    interval: {
      type: String,
      enum: ["day", "week", "month", "year"],
      required: true,
    },
    interval_count: {
      type: Number,
      required: true,
    },
    // Duration in days
    // This field is used to determine the duration of the subscription
    // ex: 7 days, 14 days, 30 days, etc.
    duration: {
      type: Number,
      required: true,
    },

    numberOfAds: {
      type: Number,
      required: true,
    },

    featuredAdBoosts: {
      type: Number,
      default: 0, // Number of "Featured Ad Boosts" included
    },

    isVerifiedBadge: {
      type: Boolean,
      default: false,
    },
    prioritySupport: {
      type: Boolean,
      default: false,
    },
    premiumSupport: {
      type: Boolean,
      default: false,
    },
    categoryId: {
      type: String,
      required: true,
    },
  },
  startDate: {
    type: Number,
    required: false,
  },
  endDate: {
    type: Number,
    required: false,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "canceled"],
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
