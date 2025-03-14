const SupportTicket = require("../../models/SupportTicket.model");

const getAllSupportForAdmin = async (req, res, next) => {
  try {
    let searchCriteria = {};
    const { start, limit, keyword, status, type } = req.query;
    const { uuid: userId } = req.user;
    if (keyword) {
      searchCriteria = {
        $or: [
          { title: { $regex: `^${keyword.trim()}`, $options: "i" } },
          { description: { $regex: `^${keyword.trim()}`, $options: "i" } },
          {
            "customer.email": { $regex: `^${keyword.trim()}`, $options: "i" },
          },
          {
            "customer.firstName": {
              $regex: `^${keyword.trim()}`,
              $options: "i",
            },
          },
          {
            "customer.lastName": {
              $regex: `^${keyword.trim()}`,
              $options: "i",
            },
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
        $lookup: {
          from: "user",
          localField: "user",
          foreignField: "uuid",
          as: "customer",
        },
      },
      {
        $unwind: {
          path: "$customer",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          "customer.snapTrade": 0,
          "customer.stripe": 0,
          "customer.limits": 0,
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
        $match: searchCriteria,
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

module.exports = getAllSupportForAdmin;
