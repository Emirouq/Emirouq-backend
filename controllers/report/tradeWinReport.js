const Trade = require("../../models/Trade.model");
const { searchBy } = require("../../utils/socket/searchBy");

const tradeWinReport = async (req, res, next) => {
  const { accountIds, startDate, endDate } = req.query;

  const searchCriteria = searchBy({
    startDate,
    endDate,
  });
  try {
    const trades = await Trade.aggregate([
      {
        $match: {
          status: "closed",
        },
      },
      {
        $sort: {
          closeDate: -1,
        },
      },
      {
        $set: {
          netPnl: {
            $cond: [
              { $eq: ["$calculationMethod", "fifo"] },
              "$fifo.netPnl",
              "$wa.netPnl",
            ],
          },
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
        $set: {
          groupingDate: {
            $cond: [
              { $eq: ["$status", "closed"] },
              "$closeDate",
              "$latestExecutionDate",
            ],
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
        $set: {
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
        $group: {
          _id: null,
          nplTrades: {
            $push: {
              netPnl: {
                $cond: [{ $gt: ["$netPnl", 0] }, true, false],
              },
            },
          },
          grossTrades: {
            $push: {
              grossPnl: {
                $cond: [{ $gt: ["$grossPnl", 0] }, true, false],
              },
            },
          },
        },
      },
      {
        $project: {
          pnlConsecutiveWins: {
            $reduce: {
              input: "$nplTrades.netPnl",
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
          pnlConsecutiveLosses: {
            $reduce: {
              input: "$nplTrades.netPnl",
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
              input: "$grossTrades.grossPnl",
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
          grossConsecutiveLosses: {
            $reduce: {
              input: "$grossTrades.grossPnl",
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
          _id: 0,
          pnlConsecutiveWins: {
            $max: ["$pnlConsecutiveWins.maxCount", "$pnlConsecutiveWins.count"],
          },
          pnlConsecutiveLosses: {
            $max: [
              "$pnlConsecutiveLosses.maxCount",
              "$pnlConsecutiveLosses.count",
            ],
          },
          grossConsecutiveWins: {
            $max: [
              "$grossConsecutiveWins.maxCount",
              "$grossConsecutiveWins.count",
            ],
          },
          grossConsecutiveLosses: {
            $max: [
              "$grossConsecutiveLosses.maxCount",
              "$grossConsecutiveLosses.count",
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

module.exports = tradeWinReport;
