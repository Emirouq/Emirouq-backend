const Trade = require("../../../models/Trade.model");
const dayjs = require("dayjs");
const { searchBy } = require("../../../utils/socket/searchBy");

const instrumentReport = async (req, res, next) => {
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
          symbolName: {
            $cond: [
              {
                $or: [
                  { $eq: ["$tradeType", "option"] },
                  { $eq: ["$tradeType", "forex"] },
                ],
              },
              "$underlyingSymbol",
              "$symbol",
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
          symbolName: 1,
          symbol: 1,
          tradeType: 1,
          underlyingSymbol: 1,
          groupingDate: 1,
          totalQuantity: 1,
          totalCommission: 1,
          positionSize: 1,
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
        $facet: {
          symbolDistribution: [
            {
              $group: {
                _id: "$symbolName",
                symbol: { $first: "$symbol" },
                tradeType: { $first: "$tradeType" },
                underlyingSymbol: { $first: "$underlyingSymbol" },
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
              $sort: {
                totalTrades: -1,
              },
            },
            {
              $limit: 30,
            },
            {
              $project: {
                _id: 1,
                symbolName: "$_id",
                symbol: "$symbol",
                underlyingSymbol: {
                  $cond: [
                    { $ifNull: ["$underlyingSymbol", false] },
                    "$underlyingSymbol",
                    "$_id",
                  ],
                },
                totalTrades: {
                  $cond: [
                    { $ifNull: ["$totalTrades", false] },
                    "$totalTrades",
                    0,
                  ],
                },
                totalProfit: {
                  $cond: [
                    { $ifNull: ["$totalProfit", false] },
                    "$totalProfit",
                    0,
                  ],
                },
                totalLoss: 1,
                totalVolume: 1,
                avgPositionSize: 1,
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
          ],
          symbolPerformanceProfit: [
            {
              $group: {
                _id: "$symbolName",
                tradeType: { $first: "$tradeType" },
                symbol: { $first: "$symbol" },
                underlyingSymbol: { $first: "$underlyingSymbol" },
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
              $sort: {
                pnl: -1,
              },
            },
            {
              $limit: 30,
            },
            {
              $project: {
                _id: 1,
                symbolName: "$_id",
                tradeType: "$tradeType",
                symbol: "$symbol",
                underlyingSymbol: {
                  $cond: [
                    { $ifNull: ["$underlyingSymbol", false] },
                    "$underlyingSymbol",
                    "$_id",
                  ],
                },
                totalTrades: {
                  $cond: [
                    { $ifNull: ["$totalTrades", false] },
                    "$totalTrades",
                    0,
                  ],
                },
                totalProfit: {
                  $cond: [
                    { $ifNull: ["$totalProfit", false] },
                    "$totalProfit",
                    0,
                  ],
                },
                totalLoss: 1,
                totalVolume: 1,
                avgPositionSize: 1,
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
          ],
          symbolPerformanceLoss: [
            {
              $group: {
                _id: "$symbolName",
                tradeType: { $first: "$tradeType" },
                symbol: { $first: "$symbol" },
                underlyingSymbol: { $first: "$underlyingSymbol" },
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
              $sort: {
                pnl: 1,
              },
            },
            {
              $limit: 30,
            },
            {
              $project: {
                _id: 1,
                symbolName: "$_id",
                tradeType: "$tradeType",
                symbol: "$symbol",
                underlyingSymbol: {
                  $cond: [
                    { $ifNull: ["$underlyingSymbol", false] },
                    "$underlyingSymbol",
                    "$_id",
                  ],
                },
                totalTrades: {
                  $cond: [
                    { $ifNull: ["$totalTrades", false] },
                    "$totalTrades",
                    0,
                  ],
                },
                totalProfit: {
                  $cond: [
                    { $ifNull: ["$totalProfit", false] },
                    "$totalProfit",
                    0,
                  ],
                },
                totalLoss: 1,
                totalVolume: 1,
                avgPositionSize: 1,
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
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        symbolDistribution: data?.[0].symbolDistribution || [],
        symbolPerformance: data?.[0].symbolPerformanceProfit || [],
        symbolPerformanceLoss: data?.[0].symbolPerformanceLoss || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = instrumentReport;
