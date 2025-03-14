const Trade = require("../../models/Trade.model");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const { searchBy } = require("../../utils/socket/searchBy");
dayjs.extend(utc);

const plannedRealizedStats = async (req, res, next) => {
  const { accountIds, startDate, endDate, status, result, tradeType } =
    req.query;
  const searchCriteria = searchBy({
    startDate,
    endDate,
    status,
    result,
    tradeType,
  });

  try {
    const trades = await Trade.aggregate([
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
          netPnl: {
            $cond: [
              { $eq: ["$calculationMethod", "fifo"] },
              "$fifo.netPnl",
              "$wa.netPnl",
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
        $project: {
          accountId: 1,
          plannedRMultiple: 1,
          realizeRMultiple: 1,
          status: 1,
          closeDate: 1,
          latestExecutionDate: 1,
          result: 1,
          tradeType: 1,
          side: 1,
          adjustedProceed: 1,
          adjustedCost: 1,
        },
      },
      {
        $set: {
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
        },
      },
      {
        $facet: {
          plannedMultiple: [
            {
              $match: {
                accountId: { $in: accountIds.split(",") },
                ...searchCriteria,
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
          avgPositionSize: [
            {
              $match: {
                accountId: { $in: accountIds.split(",") },
                ...searchCriteria,
              },
            },

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
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...trades?.[0]?.plannedMultiple?.[0],
        ...trades?.[0]?.avgPositionSize?.[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = plannedRealizedStats;
