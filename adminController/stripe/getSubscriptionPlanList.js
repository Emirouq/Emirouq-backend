const SubscriptionPlan = require("../../models/SubscriptionPlan.model");

const getSubscriptionPlanList = async (req, res, next) => {
  try {
    const subscriptionPlans = await SubscriptionPlan.find({}).res.json({
      success: true,
      data: subscriptionPlans,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getSubscriptionPlanList;
