const dayjs = require("dayjs");
const httpErrors = require("http-errors");
const UserSubscription = require("../../models/UserSubscription.model");
const Transaction = require("../../models/Transaction.model");
const Post = require("../../models/Post.model");
const Category = require("../../models/Category.model");
const User = require("../../models/User.model");
const { effectiveStatusExpr, ADMIN_USER_PROJECTION } = require("./shared");

/**
 * GET /admin/api/subscriptions/:id
 * One subscription: the user, the package and its benefits next to what was
 * actually used, and every payment for it.
 */
const getSubscription = async (req, res, next) => {
  try {
    const [subscription] = await UserSubscription.aggregate([
      { $match: { uuid: req.params.id } },
      { $set: { effectiveStatus: effectiveStatusExpr() } },
      { $project: { usedFingerPrints: 0, fingerPrint: 0 } },
    ]);
    if (!subscription) throw httpErrors.NotFound("Subscription not found");

    const plan = subscription.subscriptionPlan || {};
    const periodFilter = {
      ...(subscription.startDate && {
        $gte: dayjs.unix(subscription.startDate).toDate(),
      }),
      ...(subscription.endDate && {
        $lte: dayjs.unix(subscription.endDate).toDate(),
      }),
    };

    const [user, category, transactions, adsThisPeriod, liveAds, totalAds] =
      await Promise.all([
        User.findOne({ uuid: subscription.user }).select(ADMIN_USER_PROJECTION).lean(),
        Category.findOne({ uuid: plan.categoryId }).select("uuid title isActive -_id").lean(),
        Transaction.find({ subscriptionId: subscription.subscriptionId })
          .sort({ paidAt: -1, createdAt: -1 })
          .lean(),
        // Same rule the ad limit uses (middlewares/access_checker.js).
        Post.countDocuments({
          subscriptionId: subscription.subscriptionId,
          adType: "paid",
          isExpired: false,
          status: { $in: ["pending", "active"] },
          ...(Object.keys(periodFilter).length && { createdAt: periodFilter }),
        }),
        Post.countDocuments({
          subscriptionId: subscription.subscriptionId,
          status: "active",
          isExpired: false,
        }),
        Post.countDocuments({ subscriptionId: subscription.subscriptionId }),
      ]);

    res.json({
      message: "Subscription",
      data: {
        ...subscription,
        user,
        category,
        benefits: {
          adsAllowed: plan.name === "Business" ? null : plan.numberOfAds,
          adsUsedThisPeriod: adsThisPeriod,
          liveAds,
          totalAdsPosted: totalAds,
          featuredBoostsIncluded: plan.featuredAdBoosts || 0,
          featuredBoostsUsed: subscription.featuredAdBoostsUsed || 0,
          verifiedBadge: !!plan.isVerifiedBadge,
          prioritySupport: !!plan.prioritySupport,
          premiumSupport: !!plan.premiumSupport,
          durationDays: plan.duration,
        },
        transactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getSubscription;
