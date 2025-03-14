const httpErrors = require("http-errors");
const Trade = require("../../models/Trade.model");
const dayjs = require("dayjs");
const { searchBy } = require("../../utils/socket/searchBy");

const cumulativeStats = async (req, res, next) => {
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
    const data = await Trade.aggregate([
      {
        $set: {
          groupingDate: {
            $cond: [
              { $eq: ["$status", "closed"] },
              "$closeDate",
              "$latestExecutionDate",
            ],
          },
          netPnl: {
            $cond: [
              {
                $eq: ["$calculationMethod", "fifo"], // If it's netPnl and fifo, return fifo.netPnl
              },
              "$fifo.netPnl",
              "$wa.netPnl",
            ],
          },
          grossPnl: {
            $cond: [
              {
                $eq: ["$calculationMethod", "fifo"], // If it's netPnl and fifo, return fifo.netPnl
              },
              "$fifo.grossPnl",
              "$wa.grossPnl",
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

      // {
      //   $group: {
      //     _id: {
      //       $dateToString: {
      //         format: "%Y-%m-%d",
      //         date: "$groupingDate",
      //         timezone: "America/New_York",
      //       },
      //     },
      //     netPnl: {
      //       $sum: {
      //         $cond: [
      //           { $eq: ["$calculationMethod", "fifo"] },
      //           "$fifo.netPnl",
      //           "$wa.netPnl",
      //         ],
      //       },
      //     },
      //     grossPnl: {
      //       $sum: {
      //         $cond: [
      //           { $eq: ["$calculationMethod", "fifo"] },
      //           "$fifo.grossPnl",
      //           "$wa.grossPnl",
      //         ],
      //       },
      //     },
      //     count: {
      //       $sum: {
      //         $cond: [{ $eq: ["$status", "closed"] }, 1, 0],
      //       },
      //     },
      //   },
      // },
      {
        $facet: {
          cumulative: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$groupingDate",
                    format: "America/New_York",
                  },
                },
                nplProfit: { $sum: "$netPnl" },
                grossProfit: { $sum: "$grossPnl" },
              },
            },
            {
              $match: {
                _id: {
                  $ne: null,
                },
              },
            },
            {
              $setWindowFields: {
                partitionBy: null,
                sortBy: { _id: 1 },
                output: {
                  netPnl: {
                    $sum: "$nplProfit",
                    window: {
                      documents: ["unbounded", "current"],
                    },
                  },
                  grossPnl: {
                    $sum: "$grossProfit",
                    window: {
                      documents: ["unbounded", "current"],
                    },
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                date: "$_id",
                netPnl: 1,
                grossPnl: 1,
              },
            },
            {
              $sort: {
                _id: 1,
              },
            },
          ],
          netPnl: [
            {
              $group: {
                _id: null,
                netPnl: { $sum: "$netPnl" },
              },
            },
          ],
          grossPnl: [
            {
              $group: {
                _id: null,
                grossPnl: { $sum: "$grossPnl" },
              },
            },
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: data?.[0].cumulative,
        netPnl: data?.[0].netPnl[0]?.netPnl || 0,
        grossPnl: data?.[0].grossPnl[0]?.grossPnl || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = cumulativeStats;
