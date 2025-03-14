const Trade = require("../../../models/Trade.model");
const { searchBy } = require("../../../utils/socket/searchBy");

const dteReport = async (req, res, next) => {
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
          tradeType: "option",
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
          },
          diffDate: {
            $dateDiff: {
              startDate: "$closeDate",
              endDate: "$expDate",
              unit: "day",
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
          diffDate: 1,
          symbol: 1,
          underlyingSymbol: 1,
        },
      },
      {
        $bucket: {
          groupBy: "$diffDate",
          boundaries: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, Infinity],
          default: null,
          output: {
            totalTrades: { $sum: 1 },
            diffDate: { $push: "$diffDate" },
            symbol: { $push: "$symbol" },
            underlyingSymbol: { $push: "$underlyingSymbol" },
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
          range: {
            step: 1,
            bounds: "full",
          },
        },
      },
      {
        $addFields: {
          lowerBound: {
            $cond: {
              if: { $eq: ["$_id", null] }, // If _id is null (None)
              then: "10+ more", // Use the label "40,000 and more"
              else: "$_id", // Otherwise, use the bucket value
            },
          },
          range: {
            $cond: {
              if: { $eq: ["$_id", null] }, // For the "None" category
              then: "10+ more", // Use the label "40,000 and more"
              else: {
                $arrayElemAt: [
                  [
                    "Same Day",
                    "1 day",
                    "2 days",
                    "3 days",
                    "4 days",
                    "5 days",
                    "6 days",
                    "7 days",
                    "8 days",
                    "9 days",
                    "10+ more",
                  ],
                  {
                    $add: [
                      {
                        $indexOfArray: [
                          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, Infinity],
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
          symbol: 1,
          diffDate: 1,
          underlyingSymbol: 1,
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

module.exports = dteReport;
