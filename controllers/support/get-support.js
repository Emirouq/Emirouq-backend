const SupportTicket = require("../../models/SupportTicket.model");

const getSupport = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;
    let searchCriteria = {};
    const { start, limit, keyword, status, type } = req.query;

    if (keyword) {
      searchCriteria = {
        $or: [
          { title: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
          {
            "user.email": { $regex: keyword, $options: "i" },
          },
          {
            "user.firstName": { $regex: keyword, $options: "i" },
          },
          {
            "user.lastName": { $regex: keyword, $options: "i" },
          },
        ],
      };
    }
    if (status) {
      searchCriteria.status = status;
    }
    if (type) {
      searchCriteria.type = type;
    }

    const data = await SupportTicket.aggregate([
      {
        $match: { user: userId, isDeleted: false },
      },
      {
        $match: searchCriteria,
      },
      {
        $lookup: {
          from: "user",
          localField: "user",
          foreignField: "uuid",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          "user.snapTrade": 0,
          "user.stripe": 0,
          "user.limits": 0,
        },
      },
      {
        $set: {
          isSeen: {
            $cond: {
              if: {
                $gt: [
                  "$lastMessageTime",
                  {
                    $ifNull: [
                      {
                        $arrayElemAt: [
                          "$participants.lastViewedTime",
                          {
                            $indexOfArray: ["$participants.user", userId],
                          },
                        ],
                      },
                      0,
                    ],
                  },
                ],
              },
              then: false,
              else: true,
            },
          },
        },
      },
      {
        $set: {
          unSeenRecord: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$participants",
                  as: "participant",
                  cond: {
                    $eq: ["$$participant.user", userId],
                  },
                },
              },
              0,
            ],
          },
        },
      },

      {
        $facet: {
          data: [
            {
              $sort: {
                lastMessageTime: -1,
              },
            },
            {
              $skip: parseInt(start || 0),
            },
            {
              $limit: parseInt(limit || 10),
            },
          ],
          count: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    res.json({
      data: data?.[0].data,
      count: data?.[0]?.count?.[0]?.count,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getSupport;
