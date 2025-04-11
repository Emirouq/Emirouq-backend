const SubscriptionPlan = require("../../models/SubscriptionPlan.model");
const stripe = require("../../services/stripe/getStripe");

const duration = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};
const createPlan = async (req, res, next) => {
  try {
    const {
      name,
      amount,
      currency,
      // day,week,month,year
      interval,
      // duration in days
      interval_count,
      numberOfAds,
      //number of ads that will be featured
      featuredAdBoosts,
      // when plan id business , then is verified badge will be true
      // all are boolean values
      isVerifiedBadge,
      prioritySupport,
      premiumSupport,
      additionalBenefits,
    } = req.body;

    //first create a product
    const product = await stripe.products.create({
      name,
    });

    if (product?.id) {
      //then create a plan for that product
      const plan = await stripe.plans.create({
        amount,
        currency,
        interval,
        product: product?.id,
      });
    }
    //then create a subscription plan in our db
    await SubscriptionPlan.create({
      name,
      productId: product?.id,
      planId: plan?.id,
      amount,
      currency,
      interval,
      interval_count,
      durationDays: duration[interval] * interval_count,
      numberOfAds,
      featuredAdBoosts,
      isVerifiedBadge,
      prioritySupport,
      premiumSupport,
      additionalBenefits,
    });

    res.status(200).json({
      success: true,
      message: "Plan created successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = createPlan;
