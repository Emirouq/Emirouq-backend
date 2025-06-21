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

    //if the user is not subscribed to the category, we will fetch the list of subscription plans for that category
    //heres the list of subscription plans for the category
    let subscriptionPlan = [];
    if (!!isCategorySubscribed?.uuid === false) {
      subscriptionPlan = await SubscriptionPlan.find({
        categoryId,
      });
      if (!subscriptionPlan) {
        throw new Error("No subscription plan found for this category");
      }
    }

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
