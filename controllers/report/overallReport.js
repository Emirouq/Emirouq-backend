const Trade = require("../../models/Trade.model");
const { searchBy } = require("../../utils/socket/searchBy");

const overallReport = async (req, res, next) => {
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
  //for search by date, status, result, tradeType, tags
  let searchCriteria = searchBy({
    startDate,
    endDate,
    status,
    result,
    tradeType,
    tags,
  });

  try {
    const [data] = await Trade.aggregate([
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
          pnl: {
            $cond: [
              {
                $eq: ["$calculationMethod", "fifo"],
              },
              `$fifo.${pnlType}`,
              `$wa.${pnlType}`,
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
                      { $eq: ["$pnl", 0] },
                    ],
                  },
                ],
              },
              true, // Add 1 if the condition is true
              false, // Add 0 if the condition is false
            ],
          },
          profit: {
            $cond: [{ $gt: ["$pnl", 0] }, "$pnl", 0],
          },
          loss: {
            $cond: [{ $lt: ["$pnl", 0] }, "$pnl", 0],
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
                    date: "$groupingDate",
                    timezone: "America/New_York",
                  },
                },
                pnl: {
                  $sum: "$pnl",
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
              $match: {
                _id: {
                  $ne: null,
                },
              },
            },
            {
              $sort: {
                _id: -1,
              },
            },

            {
              $group: {
                _id: null,
                largestProfitableDay: {
                  $max: "$pnl",
                },
                largestLosingDay: {
                  $min: "$pnl",
                },
                totalTradingDays: {
                  $sum: 1,
                },
                winningDays: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gt: ["$pnl", 0] },
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
                          { $lt: ["$pnl", 0] },
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
                          { $eq: ["$pnl", 0] },
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
                  $sum: "$pnl",
                },
                totalProfit: {
                  $sum: "$profit",
                },
                totalLoss: {
                  $sum: "$loss",
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
                  $min: "$loss",
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
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$groupingDate",
                    timezone: "America/New_York",
                  },
                },
                pnl: {
                  $sum: "$pnl",
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
                  $sum: "$pnl",
                },
              },
            },
          ],
          bestMonth: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m",
                    date: "$groupingDate",
                    timezone: "America/New_York",
                  },
                },
                monthlyPnl: { $sum: "$pnl" },
              },
            },
            { $sort: { monthlyPnl: -1 } },
            { $limit: 1 },
            {
              $project: {
                _id: 0,
                month: "$_id",
                pnl: "$monthlyPnl",
              },
            },
          ],
          lowestMonth: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m",
                    date: "$groupingDate",
                    timezone: "America/New_York",
                  },
                },
                monthlyPnl: { $sum: "$pnl" },
              },
            },
            { $sort: { monthlyPnl: 1 } },
            { $limit: 1 },
            {
              $project: {
                _id: 0,
                month: "$_id",
                pnl: "$monthlyPnl",
              },
            },
          ],
          averageMonth: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m",
                    date: "$groupingDate",
                    timezone: "America/New_York",
                  },
                },
                monthlyPnl: { $sum: "$pnl" },
              },
            },
            {
              $group: {
                _id: null,
                averagePnl: { $avg: "$monthlyPnl" },
                totalPnl: { $sum: "$monthlyPnl" },
                months: {
                  $sum: 1,
                },
              },
            },
            {
              $project: {
                _id: 0,
                averagePnl: 1,
                totalPnl: 1,
                months: 1,
              },
            },
          ],
          dailyWinStreak: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$groupingDate",
                    timezone: "America/New_York",
                  },
                },
                pnl: {
                  $sum: "$pnl",
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
                pnl: 1,
                isPnlPositive: {
                  $cond: [{ $gte: ["$pnl", 0] }, true, false],
                },
              },
            },

            {
              $group: {
                _id: null,
                pnlCounts: {
                  $push: "$isPnlPositive",
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
                  $max: [
                    "$pnlConsecutiveWins.maxCount",
                    "$pnlConsecutiveWins.count",
                  ],
                },
                dailyPnlConsecutiveLosses: {
                  $max: [
                    "$pnlConsecutiveLose.maxCount",
                    "$pnlConsecutiveLose.count",
                  ],
                },
              },
            },
          ],
          tradeWinStreak: [
            {
              $match: {
                status: "closed",
              },
            },
            {
              $sort: {
                groupingDate: -1,
              },
            },
            {
              $group: {
                _id: null,
                pnlTrades: {
                  $push: {
                    pnl: {
                      $cond: [{ $gt: ["$pnl", 0] }, true, false],
                    },
                  },
                },
              },
            },
            {
              $project: {
                pnlConsecutiveWins: {
                  $reduce: {
                    input: "$pnlTrades.pnl",
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
                    input: "$pnlTrades.pnl",
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
                  $max: [
                    "$pnlConsecutiveWins.maxCount",
                    "$pnlConsecutiveWins.count",
                  ],
                },
                pnlConsecutiveLosses: {
                  $max: [
                    "$pnlConsecutiveLosses.maxCount",
                    "$pnlConsecutiveLosses.count",
                  ],
                },
              },
            },
          ],
          dailyPnl: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$groupingDate",
                    timezone: "America/New_York",
                  },
                },
                dailyPnl: {
                  $sum: "$pnl",
                },
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$bestMonth",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$lowestMonth",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$averageMonth",
          preserveNullAndEmptyArrays: true,
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

module.exports = overallReport;
