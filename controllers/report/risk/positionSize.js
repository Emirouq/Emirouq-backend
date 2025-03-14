const Trade = require("../../../models/Trade.model");
const { searchBy } = require("../../../utils/socket/searchBy");

const positionSize = async (req, res, next) => {
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
          positionSize: 1,
          totalCommission: 1,
          profit: 1,
        },
      },
      {
        $bucket: {
          groupBy: "$positionSize",
          boundaries: [
            0,
            4999,
            9999,
            14999,
            19999,
            24999,
            29999,
            34999,
            39999,
            Infinity,
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
              $push: "$profit",
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
      //since i have to make the range from 0 to 40000, i have to densify the data
      // with the range of from 0-4999,4999-9999, and so on
      {
        $densify: {
          field: "_id",
          partitionByFields: ["variety"],
          range: {
            step: 5000,
            bounds: [-1, 40000],
          },
        },
      },
      {
        $match: {
          _id: { $gte: 0 },
        },
      },
      {
        $addFields: {
          lowerBound: {
            $cond: {
              if: { $eq: ["$_id", null] }, // If _id is null (None)
              then: "40000 and more", // Use the label "40,000 and more"
              else: "$_id", // Otherwise, use the bucket value
            },
          },
          range: {
            $cond: {
              if: { $eq: ["$_id", null] }, // For the "None" category
              then: "40000 and more", // Use the label "40,000 and more"
              else: {
                $arrayElemAt: [
                  [
                    "0 - 4999",
                    "5000 - 9999",
                    "10000 - 14999",
                    "15000 - 19999",
                    "20000 - 24999",
                    "25000 - 29999",
                    "30000 - 34999",
                    "35000 - 39999",
                    "40000 or more",
                  ],
                  {
                    $add: [
                      {
                        $indexOfArray: [
                          [
                            999,
                            9999,
                            14999,
                            19999,
                            24999,
                            29999,
                            34999,
                            39999,
                            Infinity,
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

module.exports = positionSize;
