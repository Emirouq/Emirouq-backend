const Trade = require("../../models/Trade.model");
const { searchBy } = require("../../utils/socket/searchBy");

const getReportStats = async (req, res, next) => {
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
    console.time("stats");
    const executions = await Trade.aggregate([
      {
        $set: {
          groupingDate: {
            $cond: [
              { $eq: ["$status", "closed"] },
              "$closeDate",
              "$latestExecutionDate",
            ],
          },
          positionSize: {
            $cond: [
              {
                $eq: ["$side", "short"],
              },
              "$adjustedProceed",
              "$adjustedCost",
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
          profit: {
            $cond: [
              {
                $eq: ["$calculationMethod", "fifo"], // If it's netPnl and fifo, return fifo.netPnl
              },
              `$fifo.${pnlType}`,
              `$wa.${pnlType}`,
            ],
          },
          loss: {
            $cond: [
              { $eq: ["$calculationMethod", "fifo"] },
              {
                $cond: [
                  { $lt: [`$fifo.${pnlType}`, 0] },
                  `$fifo.${pnlType}`,
                  0,
                ],
              },
              { $cond: [{ $lt: [`$wa.${pnlType}`, 0] }, `$wa.${pnlType}`, 0] },
            ],
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
      {
        $match: {
          accountId: { $in: accountIds.split(",") },
          ...searchCriteria,
        },
      },

      {
        $facet: {
          dailyGrouped: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$closeDate",
                    timezone: "America/New_York",
                  },
                },
                profit: {
                  $sum: "$profit",
                },
                loss: {
                  $sum: "$loss",
                },
                breakEvenArray: {
                  $push: "$breakEven",
                },
              },
            },
            {
              $set: {
                isBreakEvenDay: {
                  $allElementsTrue: "$breakEvenArray",
                },
              },
            },
            {
              $sort: {
                _id: -1,
              },
            },
            {
              $match: {
                _id: {
                  $ne: null,
                },
              },
            },
            {
              $group: {
                _id: null,
                largestProfitableDay: {
                  $max: "$profit",
                },
                largestLosingDay: {
                  $min: "$profit",
                },
                totalTradingDays: {
                  $sum: 1,
                },
                winningDays: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gt: ["$profit", 0] },
                          { $eq: ["$isBreakEvenDay", false] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                losingDays: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $lt: ["$profit", 0] },
                          { $eq: ["$isBreakEvenDay", false] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                breakEvenDays: {
                  $sum: {
                    $cond: [
                      {
                        $or: [
                          { $eq: ["$profit", 0] },
                          { $eq: ["$isBreakEvenDay", true] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          cumulative: [
            {
              $group: {
                _id: null,
                totalPnl: {
                  $sum: "$profit",
                },
                totalProfit: {
                  $sum: {
                    $cond: [
                      {
                        $eq: ["$status", "closed"],
                      },
                      {
                        $cond: [{ $eq: ["$result", "win"] }, "$profit", 0],
                      },
                      0,
                    ],
                  },
                },
                totalLoss: {
                  $sum: {
                    $cond: [
                      {
                        $eq: ["$status", "closed"],
                      },
                      {
                        $cond: [{ $eq: ["$result", "lose"] }, "$profit", 0],
                      },
                      0,
                    ],
                  },
                },
                totalCount: {
                  $sum: {
                    $cond: [
                      {
                        $eq: ["$status", "closed"],
                      },
                      1,
                      0,
                    ],
                  },
                },
                avgPositionPerTrade: {
                  $avg: "$positionSize",
                },
                averageTradePnl: {
                  $avg: "$profit",
                },
                // averageWinningTrade: {
                //   $avg: {
                //     $cond: [{ $gt: ["$profit", 0] }, "$profit", null],
                //   },
                // },
                // averageLosingTrade: {
                //   $avg: {
                //     $cond: [{ $lt: ["$profit", 0] }, "$profit", null],
                //   },
                // },
                totalCommissions: {
                  $sum: "$totalCommission",
                },
                winningTrades: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$breakEven", false] },
                          { $eq: ["$status", "closed"] },
                          { $gt: ["$profit", 0] },
                        ],
                      },
                      1, // Add 1 if the condition is true
                      0, // Add 0 if the condition is false
                    ],
                  },
                },
                losingTrades: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$breakEven", false] },
                          { $eq: ["$status", "closed"] },
                          { $lt: ["$loss", 0] },
                        ],
                      },
                      1, // Add 1 if the condition is true
                      0, // Add 0 if the condition is false
                    ],
                  },
                },
                breakEvenTrades: {
                  $sum: {
                    $cond: {
                      if: { $eq: ["$breakEven", true] },
                      then: 1,
                      else: 0,
                    },
                  },
                },
                largestProfit: {
                  $max: "$profit",
                },
                largestLoss: {
                  $min: "$profit",
                },
              },
            },
            {
              $project: {
                _id: 0,
                totalPnl: 1,
                totalCount: 1,
                avgPositionPerTrade: 1,
                averageTradePnl: 1,
                averageWinningTrade: {
                  $cond: [
                    {
                      $eq: ["$winningTrades", 0],
                    },
                    0,
                    {
                      $divide: ["$totalProfit", "$winningTrades"],
                    },
                  ],
                },
                averageLosingTrade: {
                  $cond: [
                    {
                      $eq: ["$losingTrades", 0],
                    },
                    0,
                    {
                      $divide: ["$totalLoss", "$losingTrades"],
                    },
                  ],
                },
                totalCommissions: 1,
                winningTrades: 1,
                losingTrades: 1,
                breakEvenTrades: 1,
                largestProfit: 1,
                largestLoss: 1,
              },
            },
          ],
          cumulativePnl: [
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$groupingDate" },
                },
                pnl: {
                  $sum: "$profit",
                },
              },
            },
            {
              $match: {
                _id: {
                  $ne: null,
                },
              },
            },
            {
              $setWindowFields: {
                partitionBy: null,
                sortBy: { _id: 1 },
                output: {
                  netPnl: {
                    $sum: "$pnl",
                    window: {
                      documents: ["unbounded", "current"],
                    },
                  },
                },
              },
            },
            {
              $project: {
                _id: 1,
                date: "$_id",
                netPnl: 1,
              },
            },
            {
              $sort: {
                _id: 1,
              },
            },
          ],
          totalPnl: [
            {
              $group: {
                _id: null,
                totalPnl: {
                  $sum: "$profit",
                },
              },
            },
          ],
        },
      },
    ]);
    console.timeEnd("stats");

    const { cumulative = [], dailyGrouped = [] } = executions?.[0];

    const result = {
      // averageDailyVolume: executions[0]?.averageDailyVolume,
      averageWinningTrade: cumulative?.[0]?.averageWinningTrade || 0,
      averageLosingTrade: cumulative?.[0]?.averageLosingTrade || 0,
      numberOfWinningTrades: cumulative?.[0]?.winningTrades || 0,
      numberOfLosingTrades: cumulative?.[0]?.losingTrades || 0,
      numberOfBreakevenTrades: cumulative?.[0]?.breakEvenTrades || 0,
      totalCommission: cumulative?.[0]?.totalCommissions || 0,
      largestProfit: cumulative?.[0]?.largestProfit || 0,
      largestLoss: cumulative?.[0]?.largestLoss || 0,
      maxConsecutiveWinningDays: 0,
      maxConsecutiveLosingDays: 0,
      largestProfitDay: dailyGrouped?.[0]?.largestProfitableDay || 0,
      largestLossDay: dailyGrouped?.[0]?.largestLosingDay || 0,
      breakEvenDaysCount: dailyGrouped?.[0]?.breakEvenDays || 0,
      winningDaysCount: dailyGrouped?.[0]?.winningDays || 0,
      losingDaysCount: dailyGrouped?.[0]?.losingDays || 0,
      totalTradingDaysCount: dailyGrouped?.[0]?.totalTradingDays || 0,
      maxConsecutiveWinningTrades: 0,
      maxConsecutiveLosingTrades: 0,
      totalPnl: cumulative?.[0]?.totalPnl || 0,
      totalTradesCount: cumulative?.[0]?.totalCount || 0,
      groupedByTradeCount: cumulative?.[0]?.totalCount || 0,
      averagePositionPerTrade: cumulative?.[0]?.avgPositionPerTrade,
    };
    res.status(200).json({
      success: true,
      data: result,
      cumulativePnl: executions?.[0]?.cumulativePnl,
      totalPnl: executions?.[0]?.totalPnl?.[0]?.totalPnl || 0,
      netPnl: executions?.[0]?.totalPnl?.[0]?.totalPnl || 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getReportStats;
