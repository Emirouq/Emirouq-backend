const SupportTicket = require("../../models/SupportTicket.model");

const unreadSupportCount = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;
    const [data] = await SupportTicket.aggregate([
      {
        $match: {},
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
        $group: {
          _id: null, // Group all documents together
          unSeenCount: {
            $sum: {
              $cond: {
                if: { $eq: ["$isSeen", false] },
                then: "$unSeenRecord.count",
                else: 0,
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          unSeenCount: 1,
        },
      },
    ]);

    res.json({
      data: data?.unSeenCount || 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = unreadSupportCount;
