const SubscriptionPlan = require("../../models/SubscriptionPlan.model");
const UserSubscription = require("../../models/UserSubscription.model");

const checkSubscriptionForSpecificCategory = async (req, res, next) => {
  const { categoryId } = req.params;
  try {
    const { uuid: user } = req.user;
    if (!categoryId) {
      throw new Error("Category ID is required");
    }
    const isCategorySubscribed = await UserSubscription.findOne({
      user,
      "subscriptionPlan.categoryId": categoryId,
    });

    // Always fetch the list of purchasable plans for this category — needed both
    // when the user has no subscription yet, and when an existing subscription has
    // hit its ad limit and the user needs to buy/renew a plan to keep posting.
    const subscriptionPlan = await SubscriptionPlan.find({
      categoryId,
      isActive: true,
    });

    res.json({
      message: "User is not subscribed to this category",
      isSubscribed: !!isCategorySubscribed?.uuid,
      subscriptionPlan,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = checkSubscriptionForSpecificCategory;
