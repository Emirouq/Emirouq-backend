const httpErrors = require("http-errors");
const Trade = require("../../models/Trade.model");

const dailyWinReport = async ({ accountIds, searchCriteria }) => {
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
      },
    },

    {
      $group: {
        _id: {
          year: "$year",
          month: "$month",
          day: "$day",
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
      $project: {
        _id: 0,
        date: {
          $dateFromParts: {
            year: "$_id.year",
            month: "$_id.month",
            day: "$_id.day",
          },
        },
        netPnl: 1,
        grossPnl: 1,
        isPnlPositive: {
          $cond: [
            { $eq: ["$netPnl", 0] },
            null,
            { $cond: [{ $gt: ["$netPnl", 0] }, true, false] },
          ],
        },
        isGrossPositive: {
          $cond: [
            { $eq: ["$grossPnl", 0] },
            null,
            {
              $cond: [{ $gt: ["$grossPnl", 0] }, true, false],
            },
          ],
        },
      },
    },
    {
      $sort: {
        date: 1,
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
              // maxCount: {
              //   $max: ["$$value.maxCount", "$$value.count"],
              // },
              maxCount: {
                $cond: [
                  { $eq: ["$$this", true] },
                  {
                    $max: ["$$value.maxCount", { $add: ["$$value.count", 1] }],
                  },
                  "$$value.maxCount",
                ],
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
              // maxCount: {
              //   $max: ["$$value.maxCount", "$$value.count"],
              // },
              maxCount: {
                $cond: [
                  { $eq: ["$$this", false] },
                  {
                    $max: ["$$value.maxCount", { $add: ["$$value.count", 1] }],
                  },
                  "$$value.maxCount",
                ],
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
                $cond: [
                  { $eq: ["$$this", true] },
                  {
                    $max: ["$$value.maxCount", { $add: ["$$value.count", 1] }],
                  },
                  "$$value.maxCount",
                ],
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
                $cond: [
                  { $eq: ["$$this", false] },
                  {
                    $max: ["$$value.maxCount", { $add: ["$$value.count", 1] }],
                  },
                  "$$value.maxCount",
                ],
              },
            },
          },
        },
      },
    },
    {
      $project: {
        dailyPnlConsecutiveWins: "$pnlConsecutiveWins.maxCount",
        dailyPnlConsecutiveLosses: "$pnlConsecutiveLose.maxCount",
        dailyGrossConsecutiveWins: "$grossConsecutiveWins.maxCount",
        dailyGrossConsecutiveLosses: "$grossConsecutiveLose.maxCount",
      },
    },
  ]);
  return trades;
};

module.exports = dailyWinReport;
