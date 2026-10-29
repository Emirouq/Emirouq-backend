const SupportTicket = require("../../models/Support.model");
const { OPEN_STATUSES } = require("../../helpers/supportTickets");
const { userLookup } = require("../../helpers/userProjection");

/**
 * GET /admin/api/support/reported-ads?openOnly=true&start=&limit=
 * Reported ads, one row per ad, most open reports first.
 */
const getReportedAds = async (req, res, next) => {
  try {
    const { openOnly, start, limit } = req.query;
    const statusExpr = { $ifNull: ["$status", "open"] };

    const [result] = await SupportTicket.aggregate([
      { $match: { type: "ad_report", postId: { $exists: true }, isDeleted: { $ne: true } } },
      { $set: { status: statusExpr } },
      { $sort: { createdAt: 1 } }, // so $last below is the newest report
      {
        $group: {
          _id: "$postId",
          totalReports: { $sum: 1 },
          openReports: {
            $sum: { $cond: [{ $in: ["$status", OPEN_STATUSES] }, 1, 0] },
          },
          reasons: { $addToSet: "$reason" },
          lastReportedAt: { $max: "$createdAt" },
          latestTicketId: { $last: "$uuid" },
        },
      },
      ...(openOnly === "true" ? [{ $match: { openReports: { $gt: 0 } } }] : []),
      { $sort: { openReports: -1, lastReportedAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: parseInt(start || 0) },
            { $limit: Math.min(parseInt(limit || 20), 100) },
            {
              $lookup: {
                from: "posts",
                localField: "_id",
                foreignField: "uuid",
                pipeline: [
                  {
                    $project: {
                      _id: 0,
                      uuid: 1,
                      title: 1,
                      status: 1,
                      price: 1,
                      userId: 1,
                      file: { $slice: ["$file", 1] },
                    },
                  },
                ],
                as: "post",
              },
            },
            { $unwind: { path: "$post", preserveNullAndEmptyArrays: true } },
            userLookup({ localField: "post.userId", as: "seller" }),
            { $unwind: { path: "$seller", preserveNullAndEmptyArrays: true } },
          ],
          count: [{ $count: "count" }],
        },
      },
    ]);

    res.json({
      message: "Reported ads fetched successfully",
      data: (result?.data || []).map(({ _id, ...row }) => ({ postId: _id, ...row })),
      count: result?.count?.[0]?.count || 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getReportedAds;
