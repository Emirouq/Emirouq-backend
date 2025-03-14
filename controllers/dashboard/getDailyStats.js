const httpErrors = require("http-errors");
const Trade = require("../../models/Trade.model");
const dayjs = require("dayjs");
const { searchBy } = require("../../utils/socket/searchBy");

const getDailyStats = async (req, res, next) => {
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
          totalTrades: {
            $sum: 1,
          },
        },
      },

      {
        $project: {
          _id: 1,
          netPnl: 1,
          grossPnl: 1,
          totalTrades: 1,
        },
      },

      {
        $sort: {
          _id: 1,
        },
      },
      {
        $group: {
          _id: null,
          totalPnl: {
            $sum: "$netPnl",
          },
          totalGrossPnl: { $sum: "$grossPnl" },
          data: {
            $push: "$$ROOT",
          },
          totalPositiveTrades: {
            $sum: {
              $add: { $cond: [{ $gt: ["$netPnl", 0] }, 1, 0] },
            },
          },
        },
      },
      {
        $set: {
          totalDays: { $size: "$data" },
          winDays: {
            $size: {
              $filter: {
                input: "$data",
                as: "day",
                cond: { $gt: ["$$day.netPnl", 0] },
              },
            },
          },
          lossDays: {
            $size: {
              $filter: {
                input: "$data",
                as: "day",
                cond: { $lt: ["$$day.netPnl", 0] },
              },
            },
          },
          breakEvenDays: {
            $size: {
              $filter: {
                input: "$data",
                as: "day",
                cond: {
                  $and: [
                    {
                      $eq: ["$$day.status", "closed"],
                    },
                    {
                      $eq: ["$$day.netPnl", 0],
                    },
                  ],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalPnl: 1,
          totalGrossPnl: 1,
          data: 1,
          totalDays: 1,
          winDays: 1,
          lossDays: 1,
          breakEvenDays: 1,
          winPercent: {
            $cond: [
              { $eq: ["$totalDays", 0] },
              0,
              {
                $multiply: [{ $divide: ["$winDays", "$totalDays"] }, 100],
              },
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

module.exports = getDailyStats;
