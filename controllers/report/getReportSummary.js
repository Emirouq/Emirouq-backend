const Trade = require("../../models/Trade.model");
const { searchBy } = require("../../utils/socket/searchBy");

const getReportSummary = async (req, res, next) => {
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

  let searchCriteria = searchBy({
    startDate,
    endDate,
    status,
    result,
    tradeType,
    tags,
  });

  console.time("summary");

  try {
    const [trades] = await Trade.aggregate([
      {
        $set: {
          groupingDate: {
            $cond: [
              { $eq: ["$status", "closed"] },
              "$closeDate",
              "$latestExecutionDate",
            ],
          },
          pnl: {
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
                      { $eq: ["$pnl", 0] },
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
          bestMonth: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m",
                    date: "$groupingDate",
                    timezone: "America/New_York",
                  },
                },
                monthlyPnl: { $sum: "$pnl" },
              },
            },
            { $sort: { monthlyPnl: -1 } },
            { $limit: 1 },
            {
              $project: {
                _id: 0,
                month: "$_id",
                pnl: "$monthlyPnl",
              },
            },
          ],
          lowestMonth: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m",
                    date: "$groupingDate",
                    timezone: "America/New_York",
                  },
                },
                monthlyPnl: { $sum: "$pnl" },
              },
            },
            { $sort: { monthlyPnl: 1 } },
            { $limit: 1 },
            {
              $project: {
                _id: 0,
                month: "$_id",
                pnl: "$monthlyPnl",
              },
            },
          ],
          averageMonth: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m",
                    date: "$groupingDate",
                    timezone: "America/New_York",
                  },
                },
                monthlyPnl: { $sum: "$pnl" },
              },
            },
            {
              $group: {
                _id: null,
                averagePnl: { $avg: "$monthlyPnl" },
                totalPnl: { $sum: "$monthlyPnl" },
                months: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                averagePnl: 1,
                totalPnl: 1,
                months: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$bestMonth",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$lowestMonth",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$averageMonth",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
    console.timeEnd("summary");
    const result = {
      maxPnl: {
        month: trades?.bestMonth?.month,
        value: trades?.bestMonth?.pnl,
      },
      minPnl: {
        month: trades?.lowestMonth?.month,
        value: trades?.lowestMonth?.pnl,
      },
      avgPnl: trades?.averageMonth?.averagePnl,
      totalMonths: trades?.averageMonth?.months,
    };
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const findMinMax = (executions) => {
  let maxPnl = { value: -Infinity, month: "" };
  let minPnl = { value: Infinity, month: "" };
  let totalPnl = 0;
  executions.forEach((item) => {
    totalPnl += item.profit;
    if (item.profit > maxPnl.value) {
      maxPnl.value = item.profit;
      maxPnl.month = item._id;
    }
    if (item.profit < minPnl.value) {
      minPnl.value = item.profit;
      minPnl.month = item._id;
    }
  });

  const avgPnl = totalPnl / executions.length;

  return {
    maxPnl,
    minPnl,
    avgPnl,
  };
};

module.exports = getReportSummary;
