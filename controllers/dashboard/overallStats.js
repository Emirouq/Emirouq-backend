const Trade = require("../../models/Trade.model");
const { searchBy } = require("../../utils/socket/searchBy");

const overallStats = async (req, res, next) => {
  const {
    accountIds,
    startDate,
    endDate,
    status,
    result,
    tradeType,
    tags,
    pnlType = "netPnl",
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
    const trades = await Trade.aggregate([
      {
        $set: {
          pnl: {
            $cond: [
              {
                $eq: ["$calculationMethod", "fifo"], // If it's netPnl and fifo, return fifo.netPnl
              },
              `$fifo.${pnlType}`,
              `$wa.${pnlType}`,
            ],
          },
          groupingDate: {
            $cond: [
              { $eq: ["$status", "closed"] },
              "$closeDate",
              "$latestExecutionDate",
            ],
          },
          //since in most of the cases, breakEven in undefined or null so we need to set it to false
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
              { $eq: ["$calculationMethod", "fifo"] },
              {
                $cond: [
                  { $gte: [`$fifo.${pnlType}`, 0] },
                  `$fifo.${pnlType}`,
                  0,
                ],
              },
              { $cond: [{ $gte: [`$wa.${pnlType}`, 0] }, `$wa.${pnlType}`, 0] },
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
          accountId: { $in: accountIds?.split(",") },
          ...searchCriteria,
        },
      },

      {
        $facet: {
          metricCards: [
            {
              $group: {
                _id: null,
                totalNetPnl: {
                  $sum: {
                    $cond: [
                      {
                        $eq: ["$calculationMethod", "fifo"],
                      },
                      "$fifo.netPnl",
                      "$wa.netPnl",
                    ],
                  },
                },
                totalGrossPnl: {
                  $sum: {
                    $cond: [
                      {
                        $eq: ["$calculationMethod", "fifo"],
                      },
                      "$fifo.grossPnl",
                      "$wa.grossPnl",
                    ],
                  },
                },
                totalCommission: {
                  $sum: "$totalCommission",
                },
              },
            },
          ],
          pnlStats: [
            {
              $group: {
                _id: null,
                totalTrades: {
                  $sum: {
                    $cond: {
                      if: { $eq: ["$status", "closed"] },
                      then: 1,
                      else: 0,
                    },
                  },
                },
                totalProfit: { $sum: "$profit" },
                totalLoss: { $sum: "$loss" },
                tradeBreakEvenCount: {
                  $sum: {
                    $cond: {
                      if: { $eq: ["$breakEven", true] },
                      then: 1,
                      else: 0,
                    },
                  },
                },
                tradesWinCount: {
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
                tradesLossCount: {
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
              },
            },

            {
              $project: {
                tradeBreakEvenCount: 1,
                tradesWinCount: 1,
                tradesLossCount: 1,
                totalTrades: 1,
                totalProfit: 1,
                totalLoss: { $abs: "$totalLoss" },
                profitFactor: {
                  $cond: [
                    { $eq: ["$totalLoss", 0] },
                    0,
                    { $divide: ["$totalProfit", { $abs: "$totalLoss" }] },
                  ],
                },
                tradeWinsPercent: {
                  $cond: [
                    { $eq: ["$totalTrades", 0] },
                    0,
                    {
                      $multiply: [
                        { $divide: ["$tradesWinCount", "$totalTrades"] },
                        100,
                      ],
                    },
                  ],
                },
                avgLoss: {
                  $cond: [
                    { $eq: ["$tradesLossCount", 0] },
                    0,
                    { $divide: [{ $abs: "$totalLoss" }, "$tradesLossCount"] },
                  ],
                },
                avgWin: {
                  $cond: [
                    { $eq: ["$tradesWinCount", 0] },
                    0,
                    { $divide: ["$totalProfit", "$tradesWinCount"] },
                  ],
                },
              },
            },
            {
              $set: {
                avgWinFactor: {
                  $cond: [
                    { $eq: ["$avgLoss", 0] },
                    0,
                    { $divide: ["$avgWin", "$avgLoss"] },
                  ],
                },
              },
            },
          ],
          dailyStats: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$groupingDate",
                    timezone: "America/New_York",
                  },
                },
                totalPnl: {
                  $sum: "$pnl",
                },
                totalTrades: {
                  $sum: 1,
                },
              },
            },

            {
              $project: {
                _id: 1,
                totalPnl: 1,
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
                  $sum: "$totalPnl",
                },
                data: {
                  $push: "$$ROOT",
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
                      cond: { $gt: ["$$day.totalPnl", 0] },
                    },
                  },
                },
                lossDays: {
                  $size: {
                    $filter: {
                      input: "$data",
                      as: "day",
                      cond: { $lt: ["$$day.totalPnl", 0] },
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
                            $eq: ["$$day.totalPnl", 0],
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
          ],
          avgPositionSize: [
            {
              $group: {
                _id: null, // Group all documents together
                avgPositionSize: { $avg: "$positionSize" },
              },
            },
            {
              $project: {
                _id: 0,
                avgPositionSize: {
                  $round: ["$avgPositionSize", 2],
                },
              },
            },
          ],
          cumulative: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$groupingDate",
                    timezone: "America/New_York",
                  },
                },
                dailyProfit: { $sum: "$pnl" },
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
                  pnl: {
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
                pnl: 1,
              },
            },
          ],
          plannedMultiple: [
            {
              $match: {
                realizeRMultiple: {
                  $exists: true,
                  $ne: null,
                  $ne: 0,
                },
                plannedRMultiple: {
                  $exists: true,
                  $ne: null,
                  $ne: 0,
                },
              },
            },

            {
              $group: {
                _id: null, // Group all documents together
                avgPlannedRMultiple: { $avg: "$plannedRMultiple" },
                avgRealizedRMultiple: { $avg: "$realizeRMultiple" },
                // Calculate positive and negative realized R multiples separately
                positiveRealizedRMultiple: {
                  $avg: {
                    $cond: {
                      if: { $gt: ["$realizeRMultiple", 0] },
                      then: "$realizeRMultiple",
                      else: null,
                    },
                  },
                },
                totalPositiveRealizedRMultiple: {
                  $sum: {
                    $cond: {
                      if: { $gt: ["$realizeRMultiple", 0] },
                      then: 1,
                      else: 0,
                    },
                  },
                },
                sumPositiveRealizedRMultiple: {
                  $sum: {
                    $cond: {
                      if: { $gt: ["$realizeRMultiple", 0] },
                      then: "$realizeRMultiple",
                      else: 0,
                    },
                  },
                },
                negativeRealizedRMultiple: {
                  $avg: {
                    $cond: {
                      if: { $lt: ["$realizeRMultiple", 0] },
                      then: "$realizeRMultiple",
                      else: null,
                    },
                  },
                },
                sumNegativeRealizedRMultiple: {
                  $sum: {
                    $cond: {
                      if: { $lt: ["$realizeRMultiple", 0] },
                      then: "$realizeRMultiple",
                      else: 0,
                    },
                  },
                },
                totalNegativeRealizedRMultiple: {
                  $sum: {
                    $cond: {
                      if: { $lt: ["$realizeRMultiple", 0] },
                      then: 1,
                      else: 0,
                    },
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                avgPlannedRMultiple: {
                  $round: ["$avgPlannedRMultiple", 4],
                },
                avgRealizedRMultiple: {
                  $round: ["$avgRealizedRMultiple", 4],
                },
                positiveRealizedRMultiple: {
                  $round: ["$positiveRealizedRMultiple", 4],
                },
                negativeRealizedRMultiple: {
                  $round: ["$negativeRealizedRMultiple", 4],
                },
                totalPositiveRealizedRMultiple: 1,
                totalNegativeRealizedRMultiple: 1,
                sumPositiveRealizedRMultiple: {
                  $round: ["$sumPositiveRealizedRMultiple", 4],
                },
                sumNegativeRealizedRMultiple: {
                  $round: ["$sumNegativeRealizedRMultiple", 4],
                },
              },
            },
          ],

          calendarStats: [
            // now we are grouping the trades by date
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$groupingDate",
                    timezone: "America/New_York",
                  },
                },
                // here we are calculating the netPnl for each trade based on the calculation method
                totalPnl: {
                  $sum: "$pnl",
                },
                // to display the details on graph we are pushing the date and netPnl to an array
                totalTrades: {
                  $sum: 1,
                },
              },
            },
            {
              $sort: {
                _id: -1,
              },
            },
            {
              $project: {
                _id: 0,
                date: "$_id",
                totalPnl: 1,
                trades: 1,
              },
            },
          ],
          weeklyStats: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%U-%m-%Y",
                    date: "$groupingDate",
                    timezone: "America/New_York",
                  },
                },
                week: {
                  $first: {
                    $dateToString: {
                      format: "%U",
                      date: "$groupingDate",
                      timezone: "America/New_York",
                    },
                  },
                },
                monthYear: {
                  $first: {
                    $dateToString: {
                      format: "%m-%Y",
                      date: "$groupingDate",
                      timezone: "America/New_York",
                    },
                  },
                },
                month: {
                  $first: {
                    $dateToString: {
                      format: "%m",
                      date: "$groupingDate",
                      timezone: "America/New_York",
                    },
                  },
                },
                year: {
                  $first: {
                    $dateToString: {
                      format: "%Y",
                      date: "$groupingDate",
                      timezone: "America/New_York",
                    },
                  },
                },

                // here we are calculating the netPnl for each trade based on the calculation method
                totalPnl: {
                  $sum: "$pnl",
                },
                totalTrades: {
                  $sum: 1,
                },
              },
            },
            {
              $set: {
                week: {
                  $toInt: "$week",
                },
                month: {
                  $toInt: "$month",
                },
              },
            },
            {
              $sort: {
                week: -1,
              },
            },
            {
              $densify: {
                field: "week",
                range: {
                  step: 1, // Fill in missing weeks incrementally
                  bounds: [1, 54],
                },
              },
            },
            {
              $project: {
                _id: 1,
                week: 1,
                date: 1,
                monthYear: 1,
                year: 1,
                month: 1,
                totalPnl: 1,
                totalTrades: 1,
              },
            },
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        metricCards: trades?.[0].metricCards?.[0],
        pnlStats: trades?.[0].pnlStats?.[0],
        dailyStats: trades?.[0].dailyStats?.[0],
        avgPositionSize: trades?.[0].avgPositionSize?.[0],
        cumulative: trades?.[0].cumulative,
        plannedMultiple: trades?.[0].plannedMultiple?.[0],
        calendarStats: trades?.[0].calendarStats,
        weeklyStats: trades?.[0].weeklyStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = overallStats;
