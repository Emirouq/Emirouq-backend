const Trade = require("../../models/Trade.model");

const tradeWinReport = async ({ accountIds, searchCriteria }) => {
  const trades = await Trade.aggregate([
    {
      $match: {
        accountId: { $in: accountIds.split(",") },
        ...searchCriteria,
      },
    },
    {
      $set: {
        year: { $year: "$openDate" },
        month: { $month: "$openDate" },
        day: { $dayOfMonth: "$openDate" },
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
        openDate: 1,
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
        pnlConsecutiveWins: "$pnlConsecutiveWins.maxCount",
        pnlConsecutiveLosses: "$pnlConsecutiveLosses.maxCount",
        grossConsecutiveWins: "$grossConsecutiveWins.maxCount",
        grossConsecutiveLosses: "$grossConsecutiveLosses.maxCount",
      },
    },
  ]);

  return trades;
};

module.exports = tradeWinReport;
