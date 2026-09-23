const SubscriptionPlan = require("../../models/SubscriptionPlan.model");
const UserSubscription = require("../../models/UserSubscription.model");
const {
  getActiveCategorySubscription,
} = require("../../helpers/subscriptionAccess");

/**
 * Tells the app whether this user may publish in a category, and what plans it
 * can offer if not.
 */
const checkSubscriptionForSpecificCategory = async (req, res, next) => {
  const { categoryId } = req.params;
  try {
    const { uuid: user } = req.user;
    if (!categoryId) {
      throw new Error("Category ID is required");
    }

    // The old query matched ANY subscription row for the category, with no
    // status or expiry filter, so a cancelled or lapsed plan still reported
    // `isSubscribed: true` and the app let the user through to post.
    const activeSubscription = await getActiveCategorySubscription(
      user,
      categoryId,
    );

    // Always fetch the list of purchasable plans for this category — needed both
    // when the user has no subscription yet, and when an existing subscription has
    // hit its ad limit and the user needs to buy/renew a plan to keep posting.
    const subscriptionPlan = await SubscriptionPlan.find({
      categoryId,
      isActive: true,
    });

    const isSubscribed = Boolean(activeSubscription);

    // Distinguishes "never subscribed" from "expired/cancelled", so the app can
    // say "renew" instead of "subscribe".
    const hasLapsedSubscription =
      !isSubscribed &&
      Boolean(
        await UserSubscription.exists({
          user,
          "subscriptionPlan.categoryId": categoryId,
        }),
      );

    res.json({
      message: isSubscribed
        ? "User is subscribed to this category"
        : "User is not subscribed to this category",
      isSubscribed,
      hasLapsedSubscription,
      subscription: activeSubscription,
      subscriptionPlan,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = checkSubscriptionForSpecificCategory;
