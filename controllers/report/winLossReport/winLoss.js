const Trade = require("../../../models/Trade.model");
const dayjs = require("dayjs");
const { searchBy } = require("../../../utils/socket/searchBy");

const winLoss = async (req, res, next) => {
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
          //for filter the trades based on the netPnl
          netPnl: {
            $cond: [
              {
                $eq: ["$calculationMethod", "fifo"], // If it's netPnl and fifo, return fifo.netPnl
              },
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
      {
        $match: {
          accountId: { $in: accountIds.split(",") },
          ...searchCriteria,
        },
      },
      {
        $project: {
          groupingDate: 1,
          totalQuantity: 1,
          totalCommission: 1,
          positionSize: 1,
          profit: 1,
          netPnl: 1,
          tradeId: 1,
          breakEven: 1,
          result: 1,
        },
      },
      {
        $facet: {
          win: [
            {
              $match: {
                $and: [
                  { profit: { $gt: 0 } },
                  {
                    result: "win",
                  },
                ],
              },
            },
            {
              $group: {
                _id: null,
                pnl: { $sum: "$profit" },
                winningTrades: { $sum: 1 },
                avgWinningTrade: {
                  $avg: "$profit",
                },
                losingTrades: {
                  $sum: 0,
                },
                avgLosingTrade: {
                  $sum: 0,
                },
                avgPositionSize: { $avg: "$positionSize" },
                totalCommission: { $sum: "$totalCommission" },
              },
            },
            {
              $project: {
                _id: 0,
                pnl: { $round: ["$pnl", 2] },
                winningTrades: 1,
                avgWinningTrade: 1,
                losingTrades: 1,
                avgLosingTrade: 1,
                avgPositionSize: { $round: ["$avgPositionSize", 2] },
                totalCommission: { $round: ["$totalCommission", 2] },
              },
            },
          ],
          loss: [
            {
              $match: {
                $and: [
                  { profit: { $lt: 0 } },
                  {
                    result: "lose",
                  },
                ],
              },
            },
            {
              $group: {
                _id: null,
                pnl: { $sum: "$profit" },
                winningTrades: { $sum: 0 },
                avgWinningTrade: { $sum: 0 },
                losingTrades: { $sum: 1 },
                avgLosingTrade: {
                  $avg: "$profit",
                },
                totalCommission: { $sum: "$totalCommission" },
                avgPositionSize: { $avg: "$positionSize" },
              },
            },
            {
              $project: {
                _id: 0,
                pnl: { $round: ["$pnl", 2] },
                winningTrades: 1,
                avgWinningTrade: 1,
                losingTrades: 1,
                avgLosingTrade: 1,
                avgPositionSize: { $round: ["$avgPositionSize", 2] },
                totalCommission: { $round: ["$totalCommission", 2] },
              },
            },
          ],
          cumulativeWinTrades: [
            {
              $match: {
                $and: [
                  {
                    profit: { $gt: 0 },
                  },
                  {
                    result: "win",
                  },
                ],
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$groupingDate" },
                },
                dailyProfit: { $sum: "$profit" },
              },
            },
            {
              $setWindowFields: {
                partitionBy: null,
                sortBy: { _id: 1 },
                output: {
                  cumulativePnl: {
                    $sum: "$dailyProfit",
                    window: {
                      documents: ["unbounded", "current"],
                    },
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                date: "$_id",
                dailyProfit: 1,
                cumulativePnl: 1,
              },
            },
          ],
          cumulativeLoseTrades: [
            {
              $match: {
                $and: [
                  { profit: { $lt: 0 } },
                  {
                    result: "lose",
                  },
                ],
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$groupingDate" },
                },
                dailyProfit: { $sum: "$profit" },
              },
            },
            {
              $setWindowFields: {
                partitionBy: null,
                sortBy: { _id: 1 },
                output: {
                  cumulativePnl: {
                    $sum: "$dailyProfit",
                    window: {
                      documents: ["unbounded", "current"],
                    },
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                date: "$_id",
                dailyProfit: 1,
                cumulativePnl: 1,
              },
            },
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        win: data?.[0].win?.[0] || [],
        loss: data?.[0].loss?.[0] || [],
        cumulativeWinTrades: data?.[0].cumulativeWinTrades || [],
        cumulativeLoseTrades: data?.[0].cumulativeLoseTrades || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = winLoss;
