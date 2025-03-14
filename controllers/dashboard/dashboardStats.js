const dayjs = require("dayjs");
const Trade = require("../../models/Trade.model");
const { searchBy } = require("../../utils/socket/searchBy");

const DashboardStats = async (req, res, next) => {
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
          netPnl: {
            $cond: [
              {
                $eq: ["$calculationMethod", "fifo"], // If it's netPnl and fifo, return fifo.netPnl
              },
              `$fifo.${pnlType}`,
              `$wa.${pnlType}`,
            ],
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
        },
      },

      // for not to do nested $cond, thats why,i have assigned above and using here
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
        $facet: {
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
                dailyProfit: { $sum: "$netPnl" },
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
                netPnl: 1,
              },
            },
          ],
          netPnl: [
            {
              $group: {
                _id: null,
                netPnl: { $sum: "$netPnl" },
              },
            },
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: trades?.[0]?.pnlStats?.[0],
      cumulative: trades?.[0]?.cumulative,
      netPnl: trades?.[0]?.netPnl?.[0]?.netPnl,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = DashboardStats;
