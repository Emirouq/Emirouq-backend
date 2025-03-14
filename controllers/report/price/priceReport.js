const Trade = require("../../../models/Trade.model");
const dayjs = require("dayjs");
const { searchBy } = require("../../../utils/socket/searchBy");

const priceReport = async (req, res, next) => {
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
        $match: {
          status: "closed",
        },
      },
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
          }, // here we are calculating the total position size
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
          positionSize: 1,
          groupingDate: 1,
          totalQuantity: 1,
          totalCommission: 1,
          profit: 1,
          exitPrice: 1,
        },
      },

      // {
      //   $bucketAuto: {
      //     // boundaries: [
      //     //   -Number.MAX_VALUE,
      //     //   -500,
      //     //   -200,
      //     //   -100,
      //     //   -20,
      //     //   -5,
      //     //   0,
      //     //   2,
      //     //   5,
      //     //   10,
      //     //   20,
      //     //   50,
      //     //   100,
      //     //   200,
      //     //   500,
      //     //   Number.MAX_VALUE,
      //     // ],
      //     groupBy: "$profit",
      //     buckets: 8,
      //     output: {
      //       totalTrades: { $sum: 1 },
      //       totalWinningTrade: {
      //         $sum: {
      //           $cond: [
      //             {
      //               $gt: ["$profit", 0],
      //             },
      //             1,
      //             0,
      //           ],
      //         },
      //       },
      //       totalCommission: {
      //         $sum: "$totalCommission",
      //       },
      //       totalLoosingTrade: {
      //         $sum: {
      //           $cond: [
      //             {
      //               $lt: ["$profit", 0],
      //             },
      //             1,
      //             0,
      //           ],
      //         },
      //       },

      //       avgPrice: { $avg: "$profit" },
      //       positionSize: { $sum: "$positionSize" },
      //       avgPositionSize: { $avg: "$positionSize" },
      //       position: {
      //         $push: "$positionSize",
      //       },
      //       price: {
      //         $push: "$profit",
      //       },
      //       minPrice: { $min: "$profit" },
      //       maxPrice: { $max: "$profit" },
      //       totalProfit: {
      //         $sum: {
      //           $cond: [
      //             {
      //               $gt: ["$profit", 0],
      //             },
      //             "$profit",
      //             0,
      //           ],
      //         },
      //       },
      //       totalLoss: {
      //         $sum: {
      //           $cond: [
      //             {
      //               $lt: ["$profit", 0],
      //             },
      //             "$profit",
      //             0,
      //           ],
      //         },
      //       },
      //       pnl: { $sum: "$profit" },
      //     },
      //   },
      // },
      // {
      //   $project: {
      //     _id: 1,
      //     concatPrice: {
      //       $concat: [
      //         {
      //           $cond: {
      //             if: { $lt: ["$_id.min", 0] }, // Check if min is negative
      //             then: {
      //               $concat: [
      //                 "-",
      //                 { $literal: "$" },
      //                 { $toString: { $abs: "$_id.min" } },
      //               ],
      //             }, // Add "-" if negative
      //             else: {
      //               $concat: [{ $literal: "$" }, { $toString: "$_id.min" }],
      //             }, // Otherwise, convert to string
      //           },
      //         },
      //         " - ",
      //         {
      //           $cond: {
      //             if: { $lt: ["$_id.max", 0] }, // Check if max is negative
      //             then: {
      //               $concat: [
      //                 "-",
      //                 { $literal: "$" },
      //                 { $toString: { $abs: "$_id.max" } },
      //               ],
      //             }, // Add "-" if negative
      //             else: {
      //               $concat: [{ $literal: "$" }, { $toString: "$_id.max" }],
      //             }, // Otherwise, convert to string
      //           },
      //         },
      //       ],
      //     },
      //     totalTrades: 1,
      //     totalWinningTrade: 1,
      //     totalLoosingTrade: 1,
      //     avgPrice: 1,
      //     positionSize: 1,
      //     avgPositionSize: 1,
      //     position: 1,
      //     price: 1,
      //     minPrice: 1,
      //     maxPrice: 1,
      //     totalProfit: 1,
      //     totalLoss: 1,
      //     pnl: 1,
      //     totalCommission: 1,
      //     winPercent: {
      //       $cond: [
      //         { $eq: ["$totalTrades", 0] },
      //         0,
      //         {
      //           $round: [
      //             {
      //               $multiply: [
      //                 {
      //                   $divide: ["$totalWinningTrade", "$totalTrades"],
      //                 },
      //                 100,
      //               ],
      //             },
      //             2,
      //           ],
      //         },
      //       ],
      //     },
      //     lossPercent: {
      //       $cond: [
      //         { $eq: ["$totalTrades", 0] },
      //         0,
      //         {
      //           $round: [
      //             {
      //               $multiply: [
      //                 {
      //                   $divide: ["$totalLoosingTrade", "$totalTrades"],
      //                 },
      //                 100,
      //               ],
      //             },
      //             2,
      //           ],
      //         },
      //       ],
      //     },
      //   },
      // },
      {
        $bucket: {
          groupBy: "$exitPrice",
          boundaries: [
            -Number.MAX_VALUE,
            2.0,
            4.99,
            9.99,
            19.99,
            49.99,
            99.99,
            199.99,
            499.99,
            4999.99,
            Number.MAX_VALUE,
          ],
          default: null,
          output: {
            totalTrades: { $sum: 1 },
            totalWinningTrade: {
              $sum: {
                $cond: [
                  {
                    $gt: ["$profit", 0],
                  },
                  1,
                  0,
                ],
              },
            },
            totalCommission: {
              $sum: "$totalCommission",
            },
            totalLoosingTrade: {
              $sum: {
                $cond: [
                  {
                    $lt: ["$profit", 0],
                  },
                  1,
                  0,
                ],
              },
            },

            avgPrice: { $avg: "$profit" },
            positionSize: { $sum: "$positionSize" },
            avgPositionSize: { $avg: "$positionSize" },
            position: {
              $push: "$positionSize",
            },
            price: {
              $push: "$exitPrice",
            },

            minPrice: { $min: "$profit" },
            maxPrice: { $max: "$profit" },
            totalProfit: {
              $sum: {
                $cond: [
                  {
                    $gt: ["$profit", 0],
                  },
                  "$profit",
                  0,
                ],
              },
            },
            totalLoss: {
              $sum: {
                $cond: [
                  {
                    $lt: ["$profit", 0],
                  },
                  "$profit",
                  0,
                ],
              },
            },
            pnl: { $sum: "$profit" },
          },
        },
      },
      // {
      //   $densify: {
      //     field: "_id",
      //     range: {
      //       step: 100.0, // Make sure step is a float to match the floating-point bounds
      //       bounds: [0.0, 40000.0],
      //     },
      //   },
      // },
      {
        $addFields: {
          lowerBound: {
            $cond: {
              if: { $eq: ["$_id", null] }, // If _id is null (None)
              then: "5000 and more", // Use the label "40,000 and more"
              else: "$_id", // Otherwise, use the bucket value
            },
          },
          range: {
            $cond: {
              if: { $eq: ["$_id", null] }, // For the "None" category
              then: "5000 and more", // Use the label "40,000 and more"
              else: {
                $arrayElemAt: [
                  [
                    "Under 2",
                    "2 - 4.99",
                    "5 - 9.99",
                    "10 - 19.99",
                    "20 - 49.99",
                    "50 - 99.99",
                    "100 - 199.99",
                    "200 - 499.99",
                    "500 - 4999.99",
                    "5000 and more",
                  ],
                  {
                    $add: [
                      {
                        $indexOfArray: [
                          [
                            2, 4.99, 9.99, 19.99, 49.99, 99.99, 199.99, 499.99,
                            4999.99,
                          ],
                          "$_id",
                        ],
                      },
                      1,
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          range: 1,
          totalTrades: 1,
          totalWinningTrade: 1,
          totalLoosingTrade: 1,
          avgPrice: 1,
          positionSize: 1,
          avgPositionSize: 1,
          position: 1,
          price: 1,
          minPrice: 1,
          maxPrice: 1,
          totalProfit: 1,
          totalLoss: 1,
          pnl: 1,
          totalCommission: 1,
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

module.exports = priceReport;
