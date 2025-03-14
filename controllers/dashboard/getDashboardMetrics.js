const httpErrors = require("http-errors");
const Trade = require("../../models/Trade.model");
const dayjs = require("dayjs");
const { searchBy } = require("../../utils/socket/searchBy");

const getDashboardMetrics = async (req, res, next) => {
  const { accountIds, startDate, endDate, status, result, tradeType, tags } =
    req.query;
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
          netPnl: {
            $cond: [
              { $eq: ["$calculationMethod", "fifo"] },
              "$fifo.netPnl",
              "$wa.netPnl",
            ],
          },
          grossPnl: {
            $cond: [
              { $eq: ["$calculationMethod", "fifo"] },
              "$fifo.grossPnl",
              "$wa.grossPnl",
            ],
          },
          groupingDate: {
            $cond: [
              { $eq: ["$status", "closed"] },
              "$closeDate",
              "$latestExecutionDate",
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
          cumulative: [
            {
              $group: {
                _id: null,
                totalNetPnl: {
                  $sum: "$netPnl",
                },
                totalGrossPnl: {
                  $sum: "$grossPnl",
                },
                totalCommission: {
                  $sum: "$totalCommission",
                },
              },
            },
          ],

          records: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$groupingDate",
                    timezone: "America/New_York",
                  },
                },
                totalNetPnl: {
                  $sum: "$netPnl",
                },
                totalGrossPnl: {
                  $sum: "$grossPnl",
                },
                totalCommission: {
                  $sum: "$totalCommission",
                },
              },
            },
            {
              $sort: {
                _id: -1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$cumulative",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          cumulative: 1,
          records: {
            $slice: ["$records", 7],
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: trades[0],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getDashboardMetrics;
