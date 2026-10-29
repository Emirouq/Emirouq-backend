const SubscriptionPlan = require("../../models/SubscriptionPlan.model");
const { nowInSeconds } = require("./shared");

/**
 * GET /admin/api/subscriptions/packages
 * Every plan with its category, active subscribers and revenue.
 */
const listPackages = async (req, res, next) => {
  try {
    const now = nowInSeconds();
    const data = await SubscriptionPlan.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "uuid",
          pipeline: [{ $project: { _id: 0, uuid: 1, title: 1, isActive: 1 } }],
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "userSubscriptions",
          let: { planId: "$uuid" },
          pipeline: [
            { $match: { $expr: { $eq: ["$subscriptionPlan.planId", "$$planId"] } } },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                active: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$status", "active"] },
                          { $gt: ["$endDate", now] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          as: "subscribers",
        },
      },
      {
        $lookup: {
          from: "transactions",
          let: { planId: "$uuid" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$planId", "$$planId"] },
                status: { $in: ["succeeded", "partially_refunded"] },
              },
            },
            {
              $group: {
                _id: null,
                revenue: {
                  $sum: { $subtract: ["$amount", { $ifNull: ["$refundedAmount", 0] }] },
                },
              },
            },
          ],
          as: "revenue",
        },
      },
      {
        $project: {
          _id: 0,
          uuid: 1,
          name: 1,
          amount: 1,
          currency: 1,
          interval: 1,
          interval_count: 1,
          duration: 1,
          numberOfAds: 1,
          featuredAdBoosts: 1,
          isVerifiedBadge: 1,
          prioritySupport: 1,
          premiumSupport: 1,
          isActive: 1,
          category: 1,
          activeSubscribers: { $ifNull: [{ $first: "$subscribers.active" }, 0] },
          totalSubscribers: { $ifNull: [{ $first: "$subscribers.total" }, 0] },
          revenue: { $ifNull: [{ $first: "$revenue.revenue" }, 0] },
        },
      },
      { $sort: { "category.title": 1, amount: 1 } },
    ]);

    res.json({ message: "Packages", data });
  } catch (error) {
    next(error);
  }
};

module.exports = listPackages;
