const SubscriptionPlan = require("../../models/SubscriptionPlan.model");

const listOfSubscriptionPlan = async (req, res, next) => {
  const { categoryId } = req.params;
  try {
    if (!categoryId) {
      throw new Error("Category ID is required");
    }
    const isCategorySubscribed = await SubscriptionPlan.findOne({
      categoryId,
    });
    if (!isCategorySubscribed) {
      throw new Error("No subscription plan found for this category");
    }

    res.json({
      message: "User is not subscribed to this category",
      data: isCategorySubscribed,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = listOfSubscriptionPlan;
