const dayjs = require("dayjs");
const UserSubscription = require("../../models/UserSubscription.model");
const Transaction = require("../../models/Transaction.model");
const { effectiveStatusExpr, nowInSeconds } = require("./shared");

/** GET /admin/api/subscriptions/overview: headline numbers. */
const getOverview = async (req, res, next) => {
  try {
    const now = nowInSeconds();
    const monthStart = dayjs().startOf("month").toDate();
    const last30 = dayjs().subtract(30, "day").toDate();

    const [statusCounts, expiringSoon, revenue, failed30] = await Promise.all([
      UserSubscription.aggregate([
        { $group: { _id: effectiveStatusExpr(now), count: { $sum: 1 } } },
      ]),
      UserSubscription.countDocuments({
        status: "active",
        endDate: { $gt: now, $lte: now + 7 * 86400 },
      }),
      Transaction.aggregate([
        { $match: { status: { $in: ["succeeded", "partially_refunded", "refunded"] } } },
        {
          $group: {
            _id: null,
            total: { $sum: { $subtract: ["$amount", { $ifNull: ["$refundedAmount", 0] }] } },
            thisMonth: {
              $sum: {
                $cond: [
                  { $gte: ["$paidAt", monthStart] },
                  { $subtract: ["$amount", { $ifNull: ["$refundedAmount", 0] }] },
                  0,
                ],
              },
            },
            payments: { $sum: 1 },
          },
        },
      ]),
      Transaction.countDocuments({ status: "failed", createdAt: { $gte: last30 } }),
    ]);

    const byStatus = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));
    res.json({
      message: "Overview",
      data: {
        subscriptions: {
          active: (byStatus.active || 0) + (byStatus.ending || 0),
          ending: byStatus.ending || 0,
          expired: byStatus.expired || 0,
          cancelled: byStatus.cancelled || 0,
          expiringIn7Days: expiringSoon,
        },
        revenue: {
          total: revenue[0]?.total || 0,
          thisMonth: revenue[0]?.thisMonth || 0,
          payments: revenue[0]?.payments || 0,
          currency: "aed",
        },
        failedPaymentsLast30Days: failed30,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getOverview;
