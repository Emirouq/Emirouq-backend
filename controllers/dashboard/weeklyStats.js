const Trade = require("../../models/Trade.model");
const { searchBy } = require("../../utils/socket/searchBy");

const weeklyStats = async (req, res, next) => {
  const {
    accountIds,
    startDate,
    endDate,
    status,
    result,
    tradeType,
    tags,
    pnlType = "netPnl",
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
    const trades = await Trade.aggregate([
      {
        $set: {
          profit: {
            $cond: [
              {
                $eq: ["$calculationMethod", "fifo"], // If it's netPnl and fifo, return fifo.netPnl
              },
              `$fifo.${pnlType}`,
              `$wa.${pnlType}`,
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

      // now we are grouping the trades by week
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%U-%m-%Y",
              date: "$groupingDate",
              timezone: "America/New_York",
            },
          },
          week: {
            $first: {
              $dateToString: {
                format: "%U",
                date: "$groupingDate",
                timezone: "America/New_York",
              },
            },
          },
          monthYear: {
            $first: {
              $dateToString: {
                format: "%m-%Y",
                date: "$groupingDate",
                timezone: "America/New_York",
              },
            },
          },
          month: {
            $first: {
              $dateToString: {
                format: "%m",
                date: "$groupingDate",
                timezone: "America/New_York",
              },
            },
          },
          year: {
            $first: {
              $dateToString: {
                format: "%Y",
                date: "$groupingDate",
                timezone: "America/New_York",
              },
            },
          },

          // here we are calculating the netPnl for each trade based on the calculation method
          pnl: {
            $sum: "$profit",
          },
          totalTrades: {
            $sum: 1,
          },
        },
      },
      {
        $set: {
          week: {
            $toInt: "$week",
          },
          month: {
            $toInt: "$month",
          },
        },
      },
      {
        $sort: {
          week: -1,
        },
      },
      {
        $densify: {
          field: "week",
          range: {
            step: 1, // Fill in missing weeks incrementally
            bounds: [1, 54],
          },
        },
      },
      {
        $project: {
          _id: 1,
          week: 1,
          date: 1,
          monthYear: 1,
          year: 1,
          month: 1,
          pnl: 1,
          totalTrades: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: trades,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = weeklyStats;
