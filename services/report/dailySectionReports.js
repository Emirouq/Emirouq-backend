const httpErrors = require("http-errors");
const Trade = require("../../models/Trade.model");
const dayjs = require("dayjs");

const dailySectionReports = async ({ accountIds, searchCriteria }) => {
  const trades = await Trade.aggregate([
    {
      $match: {
        accountId: { $in: accountIds.split(",") },
        ...searchCriteria,
      },
    },
    {
      $set: {
        year: { $year: "$openDate" },
        month: { $month: "$openDate" },
        day: { $dayOfMonth: "$openDate" },
        pnlProfit: {
          $cond: [
            { $eq: ["$calculationMethod", "fifo"] },
            { $cond: [{ $gte: ["$fifo.netPnl", 0] }, "$fifo.netPnl", 0] },
            { $cond: [{ $gte: ["$wa.netPnl", 0] }, "$wa.netPnl", 0] },
          ],
        },
        pnlLoss: {
          $cond: [
            { $eq: ["$calculationMethod", "fifo"] },
            { $cond: [{ $lt: ["$fifo.netPnl", 0] }, "$fifo.netPnl", 0] },
            { $cond: [{ $lt: ["$wa.netPnl", 0] }, "$wa.netPnl", 0] },
          ],
        },
        grossProfit: {
          $cond: [
            { $eq: ["$calculationMethod", "fifo"] },
            { $cond: [{ $gte: ["$fifo.grossPnl", 0] }, "$fifo.grossPnl", 0] },
            { $cond: [{ $gte: ["$wa.grossPnl", 0] }, "$wa.grossPnl", 0] },
          ],
        },
        grossLoss: {
          $cond: [
            { $eq: ["$calculationMethod", "fifo"] },
            { $cond: [{ $lt: ["$fifo.grossPnl", 0] }, "$fifo.grossPnl", 0] },
            { $cond: [{ $lt: ["$wa.grossPnl", 0] }, "$wa.grossPnl", 0] },
          ],
        },
        openTrades: {
          $sum: {
            $cond: [
              {
                $eq: ["$status", "open"],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $sort: {
        openDate: 1,
      },
    },

    {
      $group: {
        _id: {
          year: "$year",
          month: "$month",
          day: "$day",
        },
        openTrades: { $sum: "$openTrades" },
        pnlProfit: {
          $sum: {
            $add: ["$pnlProfit", "$pnlLoss"],
          },
        },
        pnlLoss: { $sum: "$pnlLoss" },
        grossProfit: {
          $sum: {
            $add: ["$grossProfit", "$grossLoss"],
          },
        },

        grossLoss: { $sum: "$grossLoss" },
        tradingDays: {
          $addToSet: {
            year: "$year",
            month: "$month",
            day: "$day",
          },
        },
        totalVolume: {
          $sum: "$totalQuantity",
        },
      },
    },

    {
      $set: {
        largestPnlProfitableDay: {
          $max: "$pnlProfit",
        },
        largestPnlLosingDay: {
          $min: "$pnlLoss",
        },
        largestGrossProfitableDay: {
          $max: "$grossProfit",
        },
        largestGrossLosingDay: {
          $min: "$grossLoss",
        },
        tradingDays: {
          $size: "$tradingDays",
        },
        pnlWinningDays: {
          $sum: { $cond: [{ $gt: ["$pnlProfit", 0] }, 1, 0] },
        },
        pnlLosingDays: {
          $sum: { $cond: [{ $lt: ["$pnlProfit", 0] }, 1, 0] },
        },
        pnlBreakEvenDays: {
          $sum: {
            $cond: [
              {
                $and: [{ $eq: ["$pnlProfit", 0] }, { $eq: ["$pnlLoss", 0] }],
              },
              1,
              0,
            ],
          },
        },
        grossWinningDays: {
          $sum: { $cond: [{ $gt: ["$grossProfit", 0] }, 1, 0] },
        },
        grossLosingDays: {
          $sum: { $cond: [{ $lt: ["$grossProfit", 0] }, 1, 0] },
        },
        grossBreakEvenDays: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$grossProfit", 0] },
                  { $eq: ["$grossLoss", 0] },
                ],
              },
              1,
              0,
            ],
          },
        },
        avgDailyPnl: {
          $avg: {
            $sum: ["$pnlProfit", "$pnlLoss"],
          },
        },
        avgDailyGross: { $avg: { $sum: ["$grossProfit", "$grossLoss"] } },
      },
    },
    {
      $group: {
        _id: null,
        totalTradingDays: { $sum: "$tradingDays" },
        pnlProfit: { $sum: "$pnlProfit" },
        pnlLoss: { $sum: "$pnlLoss" },
        grossProfit: { $sum: "$grossProfit" },
        grossLoss: { $sum: "$grossLoss" },
        openTrades: { $sum: "$openTrades" },
        pnlWinningDays: { $sum: "$pnlWinningDays" },
        pnlLosingDays: { $sum: "$pnlLosingDays" },
        pnlBreakEvenDays: { $sum: "$pnlBreakEvenDays" },
        grossWinningDays: { $sum: "$grossWinningDays" },
        grossLosingDays: { $sum: "$grossLosingDays" },
        grossBreakEvenDays: { $sum: "$grossBreakEvenDays" },
        avgDailyGross: { $sum: "$avgDailyGross" },
        largestPnlProfitableDay: { $max: "$largestPnlProfitableDay" },
        largestPnlLosingDay: { $min: "$largestPnlLosingDay" },
        largestGrossProfitableDay: { $max: "$largestGrossProfitableDay" },
        largestGrossLosingDay: { $min: "$largestGrossLosingDay" },
        avgDailyVolume: { $avg: "$totalVolume" },
      },
    },
    {
      $set: {
        avgTradePnl: {
          $avg: {
            $sum: ["$pnlProfit", "$pnlLoss"],
          },
        },

        avgGrossPnl: { $avg: { $sum: ["$grossProfit", "$grossLoss"] } },
        grossProfitFactor: {
          $cond: [
            { $eq: ["$grossLoss", 0] },
            0,
            { $divide: ["$grossProfit", { $abs: "$grossLoss" }] },
          ],
        },
        pnlProfitFactor: {
          $cond: [
            { $eq: ["$pnlLoss", 0] },
            0,
            { $divide: ["$pnlProfit", { $abs: "$pnlLoss" }] },
          ],
        },
      },
    },
    {
      $project: {
        _id: null,
        avgTradePnl: 1,
        avgDailyVolume: 1,
        avgGrossPnl: 1,
        pnlProfit: 1,

        pnlLoss: 1,
        openTrades: 1,
        totalTradingDays: 1,
        grossProfit: 1,
        grossLoss: 1,
        grossProfitFactor: 1,
        pnlProfitFactor: 1,
        pnlWinningDays: 1,
        pnlLosingDays: 1,
        pnlBreakEvenDays: 1,
        grossWinningDays: 1,
        grossLosingDays: 1,
        grossBreakEvenDays: 1,
        avgDailyPnl: 1,
        largestPnlProfitableDay: 1,
        largestPnlLosingDay: 1,
        largestGrossProfitableDay: 1,
        largestGrossLosingDay: 1,
      },
    },
  ]);

  return trades;
};

module.exports = dailySectionReports;
