const Trade = require("../../../models/Trade.model");
const dayjs = require("dayjs");
const { searchBy } = require("../../../utils/socket/searchBy");

const weekReports = async (req, res, next) => {
  const {
    accountIds,
    startDate,
    endDate,
    status,
    result,
    tradeType,
    pnlType = "netPnl",
    tags,
  } = req.query;

  const searchCriteria = searchBy({
    startDate,
    endDate,
    status,
    result,
    tradeType,
    tags,
  });

  try {
    const data = await Trade.aggregate([
      {
        $set: {
          executionSize: {
            $size: "$executions",
          },
          groupingDate: {
            $cond: [
              { $eq: ["$status", "closed"] },
              "$closeDate",
              "$latestExecutionDate",
            ],
          },
          // here we are calculating the total position size
          positionSize: {
            $cond: [
              {
                $eq: ["$side", "short"],
              },
              "$adjustedProceed",
              "$adjustedCost",
            ],
          },

          profit: {
            $cond: [
              {
                $eq: ["$calculationMethod", "fifo"], // If it's netPnl and fifo, return fifo.netPnl
              },
              `$fifo.${pnlType}`,
              `$wa.${pnlType}`,
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
                      { $eq: ["$profit", 0] },
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
      //fetch trades with execution size greater than 0
      {
        $match: {
          executionSize: { $gt: 0 },
        },
      },
      // %U: Since January 2nd is a Tuesday, the week starts on the preceding Sunday (December 31, 2023), so the week number is 53.
      // %V: January 2nd, 2024, falls in the week starting on Monday, December 31st, 2023, and includes Thursday, January 4th, 2024, so the week number is 01.
      // %U starts with Sunday, while %V starts with Monday
      {
        $set: {
          week: {
            $dateToString: {
              format: "%V",
              date: "$groupingDate",
              timezone: "America/New_York",
            },
          },
          uv: 5,
        },
      },
      {
        $match: {
          accountId: { $in: accountIds.split(",") },
          ...searchCriteria,
        },
      },

      {
        $project: {
          week: {
            $toInt: "$week",
          },
          groupingDate: 1,
          totalQuantity: 1,
          positionSize: 1,
          totalCommission: 1,
          profit: 1,
          positiveProfit: {
            $cond: {
              if: { $gt: ["$profit", 0] },
              then: "$profit",
              else: 0,
            },
          },
          negativeProfit: {
            $cond: {
              if: { $lt: ["$profit", 0] },
              then: "$profit",
              else: 0,
            },
          },
          totalWinningTrade: {
            $cond: {
              if: { $gt: ["$profit", 0] },
              then: 1,
              else: 0,
            },
          },
          totalLoosingTrade: {
            $cond: {
              if: { $lt: ["$profit", 0] },
              then: 1,
              else: 0,
            },
          },
          uv: 1,
        },
      },

      {
        $group: {
          _id: "$week",
          totalTrades: { $sum: 1 },
          totalProfit: { $sum: "$positiveProfit" },
          totalLoss: { $sum: "$negativeProfit" },
          totalVolume: { $sum: "$totalQuantity" },
          totalCommission: { $sum: "$totalCommission" },
          pnl: { $sum: "$profit" },
          totalWinningTrade: { $sum: "$totalWinningTrade" },
          totalLoosingTrade: { $sum: "$totalLoosingTrade" },
          //since i am using brush chart, i need to have a default value as 0 for every week
          uv: {
            $sum: "$uv",
          },
          avgPositionSize: { $avg: "$positionSize" },
        },
      },
      {
        $densify: {
          field: "_id",
          range: {
            step: 1,
            bounds: [1, 54],
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
          week: "$_id",
          totalTrades: {
            $cond: [{ $ifNull: ["$totalTrades", false] }, "$totalTrades", 0],
          },
          totalProfit: {
            $cond: [{ $ifNull: ["$totalProfit", false] }, "$totalProfit", 0],
          },
          totalLoss: 1,
          avgPositionSize: 1,
          totalVolume: 1,
          totalCommission: 1,
          totalWinningTrade: 1,
          totalLoosingTrade: 1,
          weekStart: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: {
                $subtract: [
                  "$groupingDate",
                  {
                    $multiply: [
                      { $subtract: ["$week", 1] },
                      1000 * 60 * 60 * 24 * 7,
                    ],
                  },
                ],
              },
              timezone: "America/New_York",
            },
          },
          weekEnd: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: {
                $add: [
                  "$groupingDate",
                  { $multiply: [6, 1000 * 60 * 60 * 24] },
                ],
              },
              timezone: "America/New_York",
            },
          },
          uv: 1,
          winPercent: {
            $cond: [
              { $eq: ["$totalTrades", 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: ["$totalWinningTrade", "$totalTrades"],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
            ],
          },
          lossPercent: {
            $cond: [
              { $eq: ["$totalTrades", 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: ["$totalLoosingTrade", "$totalTrades"],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
            ],
          },
          //this is required, coz on client side we are displaying graph, if pnl is null, then it will not start from 0,

          pnl: {
            $cond: [{ $ifNull: ["$pnl", false] }, "$pnl", 0],
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = weekReports;
