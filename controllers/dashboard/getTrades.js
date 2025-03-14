const Trades = require("../../models/Trade.model");
const { searchBy } = require("../../utils/socket/searchBy");

const getTrades = async (req, res, next) => {
  try {
    const {
      startDate,
      endDate,
      side,
      tradeType,
      accountIds,
      status,
      result,
      tags,
    } = req.query;

    const searchCriteria = searchBy({
      startDate,
      endDate,
      status,
      result,
      tradeType,
      tags,
      side,
    });
    const trade = await Trades.aggregate([
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
          ...searchCriteria,
          accountId: {
            $in: accountIds.split(","),
          },
        },
      },
      {
        $facet: {
          open: [
            {
              $match: {
                status: "open",
              },
            },
            {
              $sort: {
                openDate: -1,
              },
            },
            {
              $limit: 10,
            },
            {
              $project: {
                _id: 0,
                symbol: 1,
                underlyingSymbol: 1,
                openDate: 1,
                totalQuantity: 1,
                uuid: 1,
                netPnl: {
                  $cond: [
                    { $eq: ["$calculationMethod", "fifo"] },
                    "$fifo.netPnl",
                    "$wa.netPnl",
                  ],
                },
              },
            },
          ],
          close: [
            {
              $match: {
                status: "closed",
              },
            },
            {
              $sort: {
                closeDate: -1,
              },
            },
            {
              $limit: 10,
            },
            {
              $project: {
                _id: 0,
                symbol: 1,
                underlyingSymbol: 1,
                closeDate: 1,
                uuid: 1,
                totalQuantity: 1,
                netPnl: {
                  $cond: [
                    { $eq: ["$calculationMethod", "fifo"] },
                    "$fifo.netPnl",
                    "$wa.netPnl",
                  ],
                },
              },
            },
          ],
        },
      },
    ]);

    res.json({
      message: "Fetched successfully",
      data: trade?.[0],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getTrades;
