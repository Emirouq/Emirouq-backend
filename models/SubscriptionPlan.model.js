const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ["basic", "started", "pro", "elite", "business"],
  },

  durationDays: {
    type: Number,
    required: true,
  },

  numberOfAds: {
    type: Number,
    required: true,
  },

  price: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
  },

  featuredAdBoosts: {
    type: Number,
    default: 0, // Number of "Featured Ad Boosts" included
  },

  additionalBenefits: {
    type: [String], // Array of additional benefits
    default: [],
  },
  isVerifiedBadge: {
    type: Boolean,
    default: false,
  },
  autoRenew: {
    type: Boolean,
    default: false,
  },
  listings: {
    type: String,
    enum: ["standard", "higher"],
    default: "standard",
  },
  prioritySupport: {
    type: Boolean,
    default: false,
  },
});

subscriptionPlanSchema.index({ name: 1 });

const SubscriptionPlan = model(
  "SubscriptionPlan",
  subscriptionPlanSchema,
  "SubscriptionPlans"
);

module.exports = SubscriptionPlan;
