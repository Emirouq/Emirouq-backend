const Trade = require("../../../models/Trade.model");
const { searchBy } = require("../../../utils/socket/searchBy");

const volumeReport = async (req, res, next) => {
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
        },
      },
      {
        $bucket: {
          groupBy: "$totalQuantity", // The field to group by
          boundaries: [1, 4, 9, 19, 49, 99, 499, 999, 1999, 2999, 3000],
          default: "3000 and more", // Default bucket
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
        $addFields: {
          lowerBound: "$_id",
          upperBound: {
            $arrayElemAt: [
              [1, 4, 9, 19, 49, 99, 499, 999, 1999, 2999, 3000],
              {
                $add: [
                  {
                    $indexOfArray: [
                      [1, 4, 9, 19, 49, 99, 499, 999, 1999, 2999, 3000],
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

      {
        $project: {
          range: {
            $cond: {
              if: { $eq: ["$_id", "3000 and more"] },
              then: "$_id",
              else: {
                $concat: [
                  { $toString: "$lowerBound" },
                  " - ",
                  { $toString: "$upperBound" },
                ],
              },
            },
          },
          _id: 1,
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

module.exports = volumeReport;
