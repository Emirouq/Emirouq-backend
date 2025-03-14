const Trade = require("../../../models/Trade.model");
const dayjs = require("dayjs");
const { searchBy } = require("../../../utils/socket/searchBy");

const dayReports = async (req, res, next) => {
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
          breakEven: {
            $cond: {
              if: {
                $eq: ["$breakEven", true],
              },
              then: true,
              else: false,
            },
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
        },
      },
      {
        $sort: {
          closeDate: -1,
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
      //fetch trades with execution size greater than 0
      {
        $match: {
          executionSize: { $gt: 0 },
        },
      },
      {
        $set: {
          day: {
            $dateToString: {
              format: "%u",
              date: "$groupingDate",
              timezone: "America/New_York",
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
        $project: {
          day: {
            $toInt: "$day",
          },
          groupingDate: 1,
          positionSize: 1,
          totalQuantity: 1,
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
        },
      },

      {
        $group: {
          _id: "$day",
          totalTrades: { $sum: 1 },
          totalProfit: { $sum: "$positiveProfit" },
          totalLoss: { $sum: "$negativeProfit" },
          totalVolume: { $sum: "$totalQuantity" },
          totalCommission: { $sum: "$totalCommission" },
          pnl: { $sum: "$profit" },
          totalWinningTrade: { $sum: "$totalWinningTrade" },
          totalLoosingTrade: { $sum: "$totalLoosingTrade" },
          avgPositionSize: { $avg: "$positionSize" },
        },
      },
      {
        $densify: {
          field: "_id",
          range: {
            step: 1,
            bounds: [1, 8],
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
          _id: 1,
          day: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", 1] }, then: "Mon" },
                { case: { $eq: ["$_id", 2] }, then: "Tue" },
                { case: { $eq: ["$_id", 3] }, then: "Wed" },
                { case: { $eq: ["$_id", 4] }, then: "Thu" },
                { case: { $eq: ["$_id", 5] }, then: "Fri" },
                { case: { $eq: ["$_id", 6] }, then: "Sat" },
                { case: { $eq: ["$_id", 7] }, then: "Sun" },
              ],
              default: null,
            },
          },
          totalTrades: {
            $cond: [{ $ifNull: ["$totalTrades", false] }, "$totalTrades", 0],
          },
          totalProfit: {
            $cond: [{ $ifNull: ["$totalProfit", false] }, "$totalProfit", 0],
          },
          avgPositionSize: 1,
          totalLoss: 1,
          totalVolume: 1,
          totalCommission: 1,
          totalWinningTrade: 1,
          totalLoosingTrade: 1,
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

module.exports = dayReports;
