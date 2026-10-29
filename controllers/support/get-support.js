const SupportTicket = require("../../models/Support.model");
const { userLookup } = require("../../helpers/userProjection");
const { toUserTicket } = require("../../helpers/supportTickets");

/**
 * GET /api/support: the signed-in user's tickets and reports, newest first,
 * with the reported ad / user and the public part of each ticket's history.
 */
const getSupport = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;
    const { start, limit, status, type } = req.query;

    const match = {
      user: userId,
      isDeleted: { $ne: true },
      ...(type && { type }),
      ...(status && { status }),
    };

    const [result] = await SupportTicket.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: parseInt(start || 0) },
            { $limit: Math.min(parseInt(limit || 20), 100) },
            {
              $lookup: {
                from: "posts",
                localField: "postId",
                foreignField: "uuid",
                pipeline: [
                  { $project: { _id: 0, uuid: 1, title: 1, file: { $slice: ["$file", 1] }, status: 1 } },
                ],
                as: "post",
              },
            },
            { $unwind: { path: "$post", preserveNullAndEmptyArrays: true } },
            userLookup({ localField: "reportedUserId", as: "reportedUser" }),
            {
              $unwind: { path: "$reportedUser", preserveNullAndEmptyArrays: true },
            },
          ],
          count: [{ $count: "count" }],
        },
      },
    ]);

    res.json({
      data: (result?.data || []).map(toUserTicket),
      count: result?.count?.[0]?.count || 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getSupport;
