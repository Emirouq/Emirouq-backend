const httpErrors = require("http-errors");
const dayjs = require("dayjs");
const { searchBy } = require("../../utils/socket/searchBy");

const getTagsReport = async (req, res, next) => {
  const {
    accountIds,
    startDate,
    endDate,
    status,
    result,
    tradeType,
    pnlType = "netPnl",
  } = req.query;

  const searchCriteria = searchBy({
    startDate,
    endDate,
    status,
    result,
    tradeType,
  });

  try {
    const executions = await Trade.aggregate([
      {
        $set: {
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
      {
        $match: {
          accountId: { $in: accountIds.split(",") },
          ...searchCriteria,
        },
      },

      {
        $match: {
          $expr: {
            $gt: [
              {
                $size: {
                  $ifNull: ["$tags", []],
                },
              },
              0,
            ],
          },
        },
      },
      {
        $unwind: {
          path: "$tags",
        },
      },
      {
        $group: {
          _id: "$tags",
          count: {
            $count: {},
          },
          loseCount: {
            $sum: {
              $cond: [
                {
                  $eq: ["$result", "lose"],
                },
                1,
                0,
              ],
            },
          },
          winCount: {
            $sum: {
              $cond: [
                {
                  $eq: ["$result", "lose"],
                },
                0,
                1,
              ],
            },
          },
          totalProfit: {
            $sum: {
              $cond: [
                {
                  $eq: ["$result", "lose"],
                },
                0,
                "$fifo.grossPnl",
              ],
            },
          },
          totalLoss: {
            $sum: {
              $cond: [
                {
                  $eq: ["$result", "lose"],
                },
                "$fifo.grossPnl",
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "tags",
          localField: "_id",
          foreignField: "uuid",
          as: "tags",
        },
      },
      {
        $unwind: {
          path: "$tags",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "tags.categoryId",
          foreignField: "uuid",
          as: "category",
        },
      },
      {
        $match: {
          "category.name": {
            $in: ["Mistakes", "Setups"],
          },
        },
      },
      {
        $unwind: {
          path: "$category",
        },
      },
      {
        $addFields: {
          winRate: {
            $multiply: [
              {
                $divide: ["$winCount", "$count"],
              },
              100,
            ],
          },
          profitFactor: {
            $cond: [
              {
                $eq: ["$totalLoss", 0],
              },
              "$totalProfit",
              {
                $divide: [
                  "$totalProfit",
                  {
                    $abs: "$totalLoss",
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          tagId: "$_id",
          count: 1,
          loseCount: 1,
          winCount: 1,
          winRate: 1,
          profitFactor: 1,
          totalProfit: 1,
          totalLoss: 1,
          tagName: "$tags.name",
          categoryName: "$category.name",
          categoryId: "$category.uuid",
        },
      },
      {
        $group: {
          _id: "$categoryName",
          data: {
            $push: "$$ROOT",
          },
        },
      },
    ]);

    const mistakes = executions.find((i) => i._id === "Mistakes");
    const setups = executions.find((i) => i._id === "Setups");

    let mistakesData = {
      mostFrequent: {
        tagName: "",
        tagId: "",
        value: 0,
      },
      leastFrequent: {
        tagName: "",
        tagId: "",
        value: Infinity,
      },
      mostLossCaused: {
        tagName: "",
        tagId: "",
        value: 0,
      },
    };

    mistakes?.data?.forEach((i) => {
      if (i.count > mistakesData.mostFrequent.value) {
        mistakesData.mostFrequent = {
          tagName: i.tagName,
          tagId: i.tagId,
          value: i.count,
        };
      }
      if (i.count < mistakesData.leastFrequent.value) {
        mistakesData.leastFrequent = {
          tagName: i.tagName,
          tagId: i.tagId,
          value: i.count,
        };
      }
      if (i.totalLoss < mistakesData.mostLossCaused.value) {
        mistakesData.mostLossCaused = {
          tagName: i.tagName,
          tagId: i.tagId,
          value: i.totalLoss,
        };
      }
    });

    let setupsData = {
      mostWinRate: {
        tagName: "",
        tagId: "",
        value: 0,
      },
      leastWinRate: {
        tagName: "",
        tagId: "",
        value: Infinity,
      },
      bestProfitFactor: {
        tagName: "",
        tagId: "",
        value: 0,
      },
      leastProfitFactor: {
        tagName: "",
        tagId: "",
        value: Infinity,
      },
      mostTraded: {
        tagName: "",
        tagId: "",
        value: 0,
      },
      leastTraded: {
        tagName: "",
        tagId: "",
        value: Infinity,
      },
    };
    setups?.data?.forEach((i) => {
      if (i.winRate > setupsData.mostWinRate.value) {
        setupsData.mostWinRate = {
          tagName: i.tagName,
          tagId: i.tagId,
          value: i.winRate,
        };
      }
      if (i.winRate < setupsData.leastWinRate.value) {
        setupsData.leastWinRate = {
          tagName: i.tagName,
          tagId: i.tagId,
          value: i.winRate,
        };
      }
      if (i.profitFactor > setupsData.bestProfitFactor.value) {
        setupsData.bestProfitFactor = {
          tagName: i.tagName,
          tagId: i.tagId,
          value: i.profitFactor,
        };
      }
      if (i.profitFactor < setupsData.leastProfitFactor.value) {
        setupsData.leastProfitFactor = {
          tagName: i.tagName,
          tagId: i.tagId,
          value: i.profitFactor,
        };
      }
      if (i.count > setupsData.mostTraded.value) {
        setupsData.mostTraded = {
          tagName: i.tagName,
          tagId: i.tagId,
          value: i.count,
        };
      }
      if (i.count < setupsData.leastTraded.value) {
        setupsData.leastTraded = {
          tagName: i.tagName,
          tagId: i.tagId,
          value: i.count,
        };
      }
    });

    res.status(200).json({
      success: true,
      data: { mistakes: mistakesData, setups: setupsData },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getTagsReport;
