const Trades = require("../../models/Trade.model");
const { searchBy } = require("../../utils/socket/searchBy");
const getTrades = async (req, res, next) => {
  try {
    const {
      start,
      limit,
      keyword,
      startDate,
      endDate,
      result,
      tradeType,
      accountIds,
      status,
      tags,
      pnlType = "netPnl",
    } = req.query;
    // for search by status, result, tradeType, tags, keyword, startDate, endDate
    const searchCriteria = searchBy({
      startDate,
      endDate,
      status,
      result,
      tradeType,
      tags,
      keyword,
    });
    const data = await Trades.aggregate([
      {
        $set: {
          // since in case of closed trades, we need to group by closeDate and in case of open trades, we need to group by latestExecutionDate
          groupingDate: {
            $cond: [
              { $eq: ["$status", "closed"] },
              "$closeDate",
              "$latestExecutionDate",
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
          netPnl: {
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
          ...searchCriteria,
          // to fetch trades of multiple accounts
          accountId: {
            $in: accountIds.split(","),
          },
        },
      },

      {
        $sort: {
          openDate: -1,
        },
      },
      {
        $facet: {
          data: [
            {
              $skip: parseInt(start || 0),
            },
            {
              $limit: parseInt(limit || 20),
            },
          ],
          count: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    res.json({
      message: "Fetched successfully",
      data: data?.[0].data,
      count: data?.[0]?.count?.[0]?.count,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getTrades;
