const { default: mongoose } = require("mongoose");
const SubscriptionPlan = require("../../models/SubscriptionPlan.model");
const stripe = require("../../services/stripe/getStripe");
const { round } = require("lodash");

const plans = [
  {
    name: "Basic",
    amount: 9.99,
    currency: "AED",
    interval: "day",
    interval_count: 1,
    numberOfAds: 4,
    featuredAdBoosts: 0,
    isVerifiedBadge: false,
    prioritySupport: false,
    premiumSupport: false,
    additionalBenefits: ["Standard Listing"],
  },
  {
    name: "Starter",
    amount: 19.99,
    currency: "AED",
    interval: "week",
    interval_count: 2,
    numberOfAds: 10,
    featuredAdBoosts: 0,
    isVerifiedBadge: false,
    prioritySupport: false,
    premiumSupport: false,
    additionalBenefits: ["Standard Listing"],
  },
  {
    name: "Pro",
    amount: 39.99,
    currency: "AED",
    interval: "month",
    interval_count: 1,
    numberOfAds: 20,
    featuredAdBoosts: 1,
    isVerifiedBadge: false,
    prioritySupport: false,
    premiumSupport: false,
    additionalBenefits: ["Higher Visibility"],
  },
  {
    name: "Elite",
    amount: 79.99,
    currency: "AED",
    interval: "month",
    interval_count: 2,
    numberOfAds: 50,
    featuredAdBoosts: 3,
    isVerifiedBadge: false,
    prioritySupport: true,
    premiumSupport: false,
    additionalBenefits: ["Priority Support"],
  },
  {
    name: "Business",
    amount: 149.99,
    currency: "AED",
    interval: "month",
    interval_count: 3,
    numberOfAds: 99999,
    featuredAdBoosts: 5,
    isVerifiedBadge: true,
    prioritySupport: false,
    premiumSupport: true,
    additionalBenefits: ["Premium Support , Verified Badge"],
  },
];
const duration = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

const createPlan = async (req, res, next) => {
  const session = await mongoose.startSession();

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
    //first create a session
    session.startTransaction();

    plans.forEach(
      async ({
        name,
        amount,
        currency,
        interval,
        interval_count,
        numberOfAds,
        featuredAdBoosts,
        isVerifiedBadge,
        prioritySupport,
        premiumSupport,
        additionalBenefits,
      }) => {
        //first create a product
        const product = await stripe.products.create({
          name,
        });
        let plan;
        if (product?.id) {
          //then create a plan for that product
          plan = await stripe.plans.create({
            amount: round(+amount * 100, 0),
            currency,
            interval,
            interval_count,
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
      }
    );
    //then commit the session
    await session.commitTransaction();
    res.status(200).json({
      success: true,
      message: "Plan created successfully",
    });
  } catch (error) {
    //if any error occurs then rollback the session
    if (session) {
      await session.abortTransaction();
    }
    console.error("Error creating plan:", error);
    next(error);
  } finally {
    await session.endSession();
  }
};

module.exports = createPlan;
