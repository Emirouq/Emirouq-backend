const Trade = require("../../../models/Trade.model");
const Tags = require("../../../models/Tags.model");
const { searchBy } = require("../../../utils/socket/searchBy");

const distributionPerformanceTagReport = async (req, res, next) => {
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
  const { categoryId } = req.params;
  const searchCriteria = searchBy({
    startDate,
    endDate,
    status,
    result,
    tradeType,
    tags,
  });
  try {
    //first we are fetching all the tags based on the category id and user id
    const allTags = await Tags.find({
      userId: req.user.uuid,
      categoryId,
    }).sort({ name: 1 });
    //it will help us to filter the tags based on the category id
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
          categories: {
            $in: [categoryId],
          },
          ...searchCriteria,
        },
      },
      //here i am filtering the tags based on the category id
      {
        $set: {
          tags: {
            $filter: {
              input: "$tags",
              as: "tag",
              cond: {
                $in: ["$$tag", allTags.map((tag) => tag.uuid)],
              },
            },
          },
        },
      },
      {
        $unwind: {
          path: "$tags",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $set: {
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
        $project: {
          groupingDate: 1,
          totalQuantity: 1,
          positionSize: 1,
          totalCommission: 1,
          profit: 1,
          tags: 1,
        },
      },
      {
        $group: {
          _id: "$tags",
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

      {
        $set: {
          tagName: {
            $arrayElemAt: [
              {
                $filter: {
                  input: allTags,
                  as: "tag",
                  cond: { $eq: ["$$tag.uuid", "$_id"] },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $sort: {
          tagName: 1,
        },
      },
      {
        $project: {
          _id: 1,
          tagName: "$tagName.name",
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
    const tagsData = allTags.map((tag) => ({
      uuid: tag.uuid,
      name: tag.name,
    }));

    res.status(200).json({
      success: true,
      data,
      tags: tagsData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = distributionPerformanceTagReport;
