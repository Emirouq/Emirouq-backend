const { default: mongoose } = require("mongoose");
const SubscriptionPlan = require("../../models/SubscriptionPlan.model");
const stripe = require("../../services/stripe/getStripe");
const { round } = require("lodash");
const { v4: uuid } = require("uuid");

const durationMap = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

const createPlan = async (req, res, next) => {
  try {
    const { categoryId, payload } = req.body;

    if (!Array.isArray(payload) || payload.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Plans array is required and must contain at least one plan",
      });
    }

    const createdPlans = [];

    for (const plan of payload) {
      const {
        name,
        amount,
        currency = "INR",
        interval,
        interval_count,
        numberOfAds,
        featuredAdBoosts,
        isVerifiedBadge,
        prioritySupport,
        premiumSupport,
        additionalBenefits,
      } = plan;

      const price = await stripe.prices.create({
        currency,
        unit_amount: round(+amount * 100, 0),
        recurring: {
          interval,
          interval_count,
        },
        product_data: {
          name,
        },
      });

      const newPlan = await SubscriptionPlan.create({
        uuid: uuid(),
        name,
        productId: price.product,
        priceId: price.id,
        isActive: price?.active,
        amount,
        currency: price.currency,
        interval: price.recurring.interval,
        interval_count: price.recurring.interval_count,
        duration:
          durationMap[price.recurring.interval] *
          price.recurring.interval_count,
        numberOfAds,
        featuredAdBoosts,
        isVerifiedBadge,
        prioritySupport,
        premiumSupport,
        additionalBenefits:
          typeof additionalBenefits === "string"
            ? additionalBenefits.split(",").map((b) => b.trim())
            : Array.isArray(additionalBenefits)
            ? additionalBenefits
            : [],
        categoryId,
      });

      createdPlans.push(newPlan);
    }

    res.status(200).json({
      success: true,
      message: "Plans created successfully",
      data: createdPlans,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = createPlan;
