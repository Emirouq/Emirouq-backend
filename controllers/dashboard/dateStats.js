const Trade = require("../../models/Trade.model");
const { searchBy } = require("../../utils/socket/searchBy");

const dateStats = async (req, res, next) => {
  const { accountIds, startDate, endDate } = req.query;

  const searchCriteria = searchBy({
    startDate,
    endDate,
  });

  try {
    const [trades] = await Trade.aggregate([
      {
        $set: {
          netPnl: {
            $cond: [
              { $eq: ["$calculationMethod", "fifo"] },
              "$fifo.netPnl",
              "$wa.netPnl",
            ],
          },
          profit: {
            $cond: [
              { $eq: ["$calculationMethod", "fifo"] },
              { $cond: [{ $gte: ["$fifo.netPnl", 0] }, "$fifo.netPnl", 0] },
              { $cond: [{ $gte: ["$wa.netPnl", 0] }, "$wa.netPnl", 0] },
            ],
          },
          loss: {
            $cond: [
              { $eq: ["$calculationMethod", "fifo"] },
              { $cond: [{ $lt: ["$fifo.netPnl", 0] }, "$fifo.netPnl", 0] },
              { $cond: [{ $lt: ["$wa.netPnl", 0] }, "$wa.netPnl", 0] },
            ],
          },
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

      // now we are grouping the trades by date
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$groupingDate",
              timezone: "America/New_York",
            },
          },
          // here we are calculating the netPnl for each trade based on the calculation method
          netPnl: {
            $sum: {
              $cond: [
                { $eq: ["$calculationMethod", "fifo"] },
                "$fifo.netPnl",
                "$wa.netPnl",
              ],
            },
          },
          // to display the details on graph we are pushing the date and netPnl to an array
          totalTrades: {
            $sum: {
              $cond: [{ $eq: ["$status", "closed"] }, 1, 0],
            },
          },
          // we are pushing all the trades to an array
          trades: {
            $push: {
              uuid: "$uuid",
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$groupingDate",
                  timezone: "America/New_York",
                },
              },
              netPnl: {
                $cond: [
                  { $eq: ["$calculationMethod", "fifo"] },
                  "$fifo.netPnl",
                  "$wa.netPnl",
                ],
              },
              breakEven: "$breakEven",
              symbol: "$symbol",
              side: "$side",
              result: "$result",
              tradeType: "$tradeType",
              status: "$status",
              currentPosition: "$currentPosition",
              executions: "$executions",
              grossPnl: "$grossPnl",
              openDate: "$openDate",
              closeDate: "$closeDate",
              avgEntryPrice: "$avgEntryPrice",
              avgExitPrice: "$avgExitPrice",
              exitPrice: "$exitPrice",
              strike: "$strike",
              contractMultiplier: "$contractMultiplier",
              instrument: "$instrument",
              expDate: "$expDate",
              underlyingSymbol: "$underlyingSymbol",
              adjustedCost: "$adjustedCost",
              accountId: "$accountId",
              totalCommission: "$totalCommission",
              netRoi: {
                $cond: [
                  { $eq: ["$calculationMethod", "fifo"] },
                  "$fifo.netRoi",
                  "$wa.netRoi",
                ],
              },
            },
          },
          grossPnl: {
            $sum: {
              $cond: [
                { $eq: ["$calculationMethod", "fifo"] },
                "$fifo.grossPnl",
                "$wa.grossPnl",
              ],
            },
          },
          volume: {
            $sum: "$totalQuantity",
          },
          commission: {
            $sum: "$totalCommission",
          },
          totalProfit: { $sum: "$profit" },
          totalLoss: { $sum: "$loss" },
          breakEvenCount: {
            $sum: {
              $cond: {
                if: { $eq: ["$breakEven", true] },
                then: 1,
                else: 0,
              },
            },
          },
          tradeWinCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$breakEven", false] },
                    { $eq: ["$status", "closed"] },
                    { $gt: ["$profit", 0] },
                  ],
                },
                1, // Add 1 if the condition is true
                0, // Add 0 if the condition is false
              ],
            },
          },
          tradeLossCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$breakEven", false] },
                    { $eq: ["$status", "closed"] },
                    { $lt: ["$loss", 0] },
                  ],
                },
                1, // Add 1 if the condition is true
                0, // Add 0 if the condition is false
              ],
            },
          },
        },
      },
      // here we are calculating the profit factor and trade wins percentage
      //profit factor = totalProfit / totalLoss
      {
        $set: {
          profitFactor: {
            $cond: {
              if: { $eq: ["$totalLoss", 0] },
              then: 0,
              else: { $divide: ["$totalProfit", { $abs: "$totalLoss" }] },
            },
          },
          tradeWinsPercent: {
            $cond: [
              { $eq: ["$totalTrades", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$tradeWinCount", "$totalTrades"] },
                  100,
                ],
              },
            ],
          },
        },
      },
      // coz in calendar stats we are only showing the latest trades
      // {
      //   $sort: {
      //     _id: -1,
      //   },
      // },
      {
        $project: {
          _id: 0,
          date: "$_id",
          totalProfit: 1,
          totalCommission: 1,
          totalVolume: 1,
          trades: 1,
          executions: 1,
          grossPnl: 1,
          netPnl: 1,
          totalTrades: { $size: "$trades" },
          profitFactor: 1,
          tradeWinsPercent: 1,
          tradeWinCount: 1,
          breakEvenCount: 1,
          tradeLossCount: 1,
          totalLoss: 1,
          volume: 1,
          commission: 1,
        },
      },
    ]);

    // HOTFIX
    // For some reason, date is getting returned as null for some trades
    // const response = [];
    // trades.forEach((i) => {
    //   if (i.date) response.push(i);
    // });

    res.status(200).json({
      success: true,
      data: trades,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = dateStats;
