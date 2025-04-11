const { Schema, model } = require("mongoose");

const subscriptionPlanSchema = Schema({
  name: {
    type: String,
    required: true,
    enum: ["Basic", "Starter", "Pro", "Elite", "Business"],
  },
  // Stripe product ID
  productId: {
    type: String,
    required: true,
  },
  // Stripe plan ID
  planId: {
    type: String,
    required: true,
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
  durationDays: {
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
  additionalBenefits: [{ type: String }],
  //if admin can temporarily disable the plan
  isActive: {
    type: Boolean,
    default: true,
  },
});

subscriptionPlanSchema.index({ name: 1 });

const SubscriptionPlan = model(
  "SubscriptionPlan",
  subscriptionPlanSchema,
  "SubscriptionPlans"
);

module.exports = SubscriptionPlan;
