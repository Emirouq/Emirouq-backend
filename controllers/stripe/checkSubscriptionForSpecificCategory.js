const SubscriptionPlan = require("../../models/SubscriptionPlan.model");
const UserSubscription = require("../../models/UserSubscription.model");
const {
  getActiveCategorySubscription,
} = require("../../helpers/subscriptionAccess");
const { getFreePostEligibility } = require("../../helpers/freePostAccess");
const { getFreeCategoryRule } = require("../../helpers/freeCategoryAccess");
const {
  getCategoryAvailability,
} = require("../../helpers/categoryAvailability");

/**
 * Tells the app whether this user may publish in a category, and what plans it
 * can offer if not.
 */
const checkSubscriptionForSpecificCategory = async (req, res, next) => {
  const { categoryId } = req.params;
  // Optional: free posting can be enabled for single sub-categories.
  const { subCategoryId, postId } = req.query;
  try {
    const { uuid: user } = req.user;
    if (!categoryId) {
      throw new Error("Category ID is required");
    }

    // Disabled category: nothing to buy, nothing to publish.
    const availability = await getCategoryAvailability(categoryId, subCategoryId);
    if (!availability.open) {
      return res.json({
        message: availability.message,
        isSubscribed: false,
        hasLapsedSubscription: false,
        subscription: null,
        subscriptionPlan: [],
        freePost: { available: false, eligible: false },
        freeCategory: { isFree: false, validityDays: null },
        categoryDisabled: true,
        canPublish: false,
      });
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

    // Admin-marked Free category: anyone may publish, no plan, no payment.
    const freeCategory = await getFreeCategoryRule(categoryId, subCategoryId);

    // Admin-enabled free posting. When eligible, the app publishes without
    // opening the plan sheet, so no payment gateway is involved.
    const freePost = await getFreePostEligibility(
      user,
      categoryId,
      subCategoryId,
      { excludePostId: postId },
    );

    res.json({
      message: isSubscribed
        ? "User is subscribed to this category"
        : "User is not subscribed to this category",
      isSubscribed,
      hasLapsedSubscription,
      freePost: {
        available: freePost.available,
        eligible: freePost.eligible,
        reason: freePost.reason || null,
        adExpiryDays: freePost.adExpiryDays || null,
        validUntil: freePost.validUntil || null,
        remaining: freePost.remaining ?? null,
      },
      freeCategory: {
        isFree: freeCategory.isFree,
        validityDays: freeCategory.validityDays || null,
      },
      categoryDisabled: false,
      canPublish: freeCategory.isFree || isSubscribed || freePost.eligible,
      subscription: activeSubscription,
      subscriptionPlan,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = checkSubscriptionForSpecificCategory;
