const httpErrors = require("http-errors");
const Post = require("../../models/Post.model");
const UserSubscription = require("../../models/UserSubscription.model");
const { LIVE_STATUSES, resolveTarget } = require("./shared");

/**
 * GET /admin/api/categories/:type/:id/impact
 * What disabling would touch, so the admin can decide what to do with ads.
 */
const getCategoryImpact = async (req, res, next) => {
  try {
    const target = await resolveTarget(req.params.type, req.params.id);
    if (!target) throw httpErrors.NotFound("Category not found");
    const { doc, postField } = target;

    const live = {
      [postField]: doc.uuid,
      status: { $in: LIVE_STATUSES },
      isExpired: { $ne: true },
    };
    const now = Math.floor(Date.now() / 1000);
    const [liveAds, paidLiveAds, heldAds, activePlans] = await Promise.all([
      Post.countDocuments(live),
      Post.countDocuments({ ...live, adType: "paid" }),
      Post.countDocuments({ "categoryHold.refId": doc.uuid }),
      req.params.type === "category"
        ? UserSubscription.countDocuments({
            "subscriptionPlan.categoryId": doc.uuid,
            status: "active",
            endDate: { $gt: now },
          })
        : 0,
    ]);

    res.json({
      message: "Impact",
      data: {
        title: doc.title,
        isActive: doc.isActive !== false,
        liveAds,
        paidLiveAds,
        heldAds,
        activePlans,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getCategoryImpact;
