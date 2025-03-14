const Trade = require("../../models/Trade.model");
const { searchBy } = require("../../utils/socket/searchBy");

const dailyWinReport = async (req, res, next) => {
  const { accountIds, startDate, endDate, status, result, tradeType, tags } =
    req.query;

  const searchCriteria = searchBy({
    startDate,
    endDate,
    status,
    result,
    tradeType,
    tags,
  });
  try {
    const trades = await Trade.aggregate([
      // {
      //   $match: {
      //     status: "closed",
      //   },
      // },
      // {
      //   $sort: {
      //     closeDate: -1,
      //   },
      // },
      {
        $set: {
          groupingDate: {
            $cond: [
              { $eq: ["$status", "closed"] },
              "$closeDate",
              "$latestExecutionDate",
            ],
          },
          netPnl: {
            $cond: [
              { $eq: ["$calculationMethod", "fifo"] },
              "$fifo.netPnl",
              "$wa.netPnl",
            ],
          },
        },
      },
      {
        $set: {
          breakEven: {
            $cond: {
              if: {
                $eq: ["$breakEven", true],
              },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $set: {
          breakEven: {
            $cond: [
              {
                $or: [
                  { $eq: ["$breakEven", true] },
                  {
                    $and: [
                      { $eq: ["$status", "closed"] },
                      { $eq: ["$netPnl", 0] },
                    ],
                  },
                ],
              },
              true, // Add 1 if the condition is true
              false, // Add 0 if the condition is false
            ],
          },
        },
      },
      {
        $set: {
          result: {
            $cond: {
              if: {
                $eq: ["$breakEven", true],
              },
              then: "breakEven",
              else: "$result",
            },
          },
        },
      },
      {
        $match: {
          accountId: { $in: accountIds.split(",") },
          ...searchCriteria,
        },
      },

      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$groupingDate",
              timezone: "America/New_York",
            },
          },
          netPnl: {
            $sum: {
              $cond: [
                { $eq: ["$calculationMethod", "fifo"] },
                "$fifo.netPnl",
                "$wa.netPnl",
              ],
            },
          },
          grossPnl: {
            $sum: {
              $cond: [
                { $eq: ["$calculationMethod", "fifo"] },
                "$fifo.grossPnl",
                "$wa.grossPnl",
              ],
            },
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
      {
        $project: {
          _id: 0,
          netPnl: 1,
          grossPnl: 1,
          isPnlPositive: {
            $cond: [{ $gte: ["$netPnl", 0] }, true, false],
          },
          isGrossPositive: { $cond: [{ $gte: ["$grossPnl", 0] }, true, false] },
        },
      },

      {
        $group: {
          _id: null,
          pnlCounts: {
            $push: "$isPnlPositive",
          },
          grossCounts: {
            $push: "$isGrossPositive",
          },
        },
      },

      {
        $project: {
          _id: 0,
          pnlConsecutiveWins: {
            $reduce: {
              input: "$pnlCounts",
              initialValue: { count: 0, maxCount: 0 },
              in: {
                count: {
                  $cond: [
                    { $eq: ["$$this", true] },
                    { $add: ["$$value.count", 1] },
                    0,
                  ],
                },
                maxCount: {
                  $max: ["$$value.maxCount", "$$value.count"],
                },
              },
            },
          },
          pnlConsecutiveLose: {
            $reduce: {
              input: "$pnlCounts",
              initialValue: { count: 0, maxCount: 0 },
              in: {
                count: {
                  $cond: [
                    { $eq: ["$$this", false] },
                    { $add: ["$$value.count", 1] },
                    0,
                  ],
                },
                maxCount: {
                  $max: ["$$value.maxCount", "$$value.count"],
                },
              },
            },
          },
          grossConsecutiveWins: {
            $reduce: {
              input: "$grossCounts",
              initialValue: { count: 0, maxCount: 0 },
              in: {
                count: {
                  $cond: [
                    { $eq: ["$$this", true] },
                    { $add: ["$$value.count", 1] },
                    0,
                  ],
                },
                maxCount: {
                  $max: ["$$value.maxCount", "$$value.count"],
                },
              },
            },
          },
          grossConsecutiveLose: {
            $reduce: {
              input: "$grossCounts",
              initialValue: { count: 0, maxCount: 0 },
              in: {
                count: {
                  $cond: [
                    { $eq: ["$$this", false] },
                    { $add: ["$$value.count", 1] },
                    0,
                  ],
                },
                maxCount: {
                  $max: ["$$value.maxCount", "$$value.count"],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          dailyPnlConsecutiveWins: {
            $max: ["$pnlConsecutiveWins.maxCount", "$pnlConsecutiveWins.count"],
          },
          dailyPnlConsecutiveLosses: {
            $max: ["$pnlConsecutiveLose.maxCount", "$pnlConsecutiveLose.count"],
          },
          dailyGrossConsecutiveWins: {
            $max: [
              "$grossConsecutiveWins.maxCount",
              "$grossConsecutiveWins.count",
            ],
          },
          dailyGrossConsecutiveLosses: {
            $max: [
              "$grossConsecutiveLose.maxCount",
              "$grossConsecutiveLose.count",
            ],
          },
        },
      },
    ]);
    res.status(200).json({
      success: true,
      data: trades?.[0],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = dailyWinReport;
