const SubscriptionPlan = require("../../models/SubscriptionPlan.model");

const getSubscriptionPlans = async (req, res, next) => {
  try {
    const { categoryId } = req.query;

    let responseData;

    if (categoryId) {
      const plans = await SubscriptionPlan.find({ categoryId });

      if (!plans || plans.length === 0) {
        return res.json({
          success: false,
          error: "No subscription plans found for the given category",
        });
      }

      responseData = plans;
    } else {
      responseData = await SubscriptionPlan.find({});
    }

    return res.status(200).json({
      success: true,
      message: "Subscription plans fetched successfully",
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getSubscriptionPlans;
