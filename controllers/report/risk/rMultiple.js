const Trade = require("../../../models/Trade.model");
const { searchBy } = require("../../../utils/socket/searchBy");

const rMultiple = async (req, res, next) => {
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
          positionSize: 1,
          realizeRMultiple: 1,
        },
      },
      {
        $bucket: {
          groupBy: { $toDouble: "$realizeRMultiple" },
          boundaries: [
            -Number.MAX_VALUE,
            -5,
            -4,
            -3,
            -2,
            -1,
            0,
            1,
            2,
            3,
            4,
            Number.MAX_VALUE,
          ], // Boundaries for ranges
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

      {
        $densify: {
          field: "_id",
          partitionByFields: ["variety"],
          range: {
            step: 1,
            bounds: [-20, 20], // Ensure that all categories from -4 to 4 and outliers (None) are displayed
          },
        },
      },
      {
        $addFields: {
          groupedValue: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$_id", null] },
                  then: {
                    _id: null,
                    range: "None",
                  },
                },
                {
                  case: {
                    $and: [{ $lt: ["$_id", -4] }],
                  },
                  then: {
                    _id: -5,
                    range: "-4R and less",
                  },
                },
                {
                  case: { $gt: ["$_id", 4] },
                  then: {
                    _id: 4,
                    range: "4R and more",
                  },
                },
                {
                  case: {
                    $eq: ["$_id", -4],
                  },
                  then: {
                    _id: -4,
                    range: "-3.99R to -3R",
                  },
                },
                {
                  case: {
                    $eq: ["$_id", -3],
                  },
                  then: {
                    _id: -3,
                    range: "-2.99R to -2R",
                  },
                },
                {
                  case: {
                    $eq: ["$_id", -2],
                  },
                  then: {
                    _id: -2,
                    range: "-1.99R to -1R",
                  },
                },
                {
                  case: {
                    $eq: ["$_id", -1],
                  },
                  then: { _id: -1, range: "-0.99R to -0.01R" },
                },
                {
                  case: { $eq: ["$_id", 0] },
                  then: {
                    _id: 0,
                    range: "0R to +0.99R",
                  },
                },
                {
                  case: { $eq: ["$_id", 1] },
                  then: {
                    _id: 1,
                    range: "+1R to +1.99R",
                  },
                },
                {
                  case: { $eq: ["$_id", 2] },
                  then: {
                    _id: 2,
                    range: "+2R to +2.99R",
                  },
                },
                {
                  case: { $eq: ["$_id", 3] },
                  then: {
                    _id: 3,
                    range: "+3R to +3.99R",
                  },
                },
              ],
              default: {
                _id: "$_id",
                range: "None",
              },
            },
          },
        },
      },

      {
        $group: {
          _id: "$groupedValue.range",
          value: { $first: "$groupedValue._id" },
          totalTrades: { $sum: "$totalTrades" },
          totalWinningTrade: { $sum: "$totalWinningTrade" },
          totalCommission: { $sum: "$totalCommission" },
          totalLoosingTrade: { $sum: "$totalLoosingTrade" },
          avgPrice: { $avg: "$avgPrice" },
          positionSize: { $sum: "$positionSize" },
          avgPositionSize: { $avg: "$avgPositionSize" },
          position: { $push: "$position" },
          price: { $push: "$price" },
          minPrice: { $min: "$minPrice" },
          maxPrice: { $max: "$maxPrice" },
          totalProfit: { $sum: "$totalProfit" },
          totalLoss: { $sum: "$totalLoss" },
          pnl: { $sum: "$pnl" },
        },
      },
      {
        $sort: {
          value: 1,
        },
      },
      {
        $project: {
          _id: 1,
          range: "$_id",
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

module.exports = rMultiple;
