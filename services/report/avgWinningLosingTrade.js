const Trade = require("../../models/Trade.model");

const avgWinningLosingTrade = async ({ accountIds, searchCriteria }) => {
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
        netPnl: {
          $sum: {
            $cond: [
              { $eq: ["$calculationMethod", "fifo"] },
              "$fifo.netPnl",
              "$wa.netPnl",
            ],
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
      },
    },
    {
      $sort: {
        openDate: 1,
      },
    },
    {
      $group: {
        _id: null,
        avgPnlWinningTrade: {
          $avg: { $cond: [{ $gt: ["$netPnl", 0] }, "$netPnl", null] },
        },
        avgPnlLosingTrade: {
          $avg: { $cond: [{ $lt: ["$netPnl", 0] }, "$netPnl", null] },
        },
        avgGrossWinningTrade: {
          $avg: { $cond: [{ $gt: ["$grossPnl", 0] }, "$grossPnl", null] },
        },
        avgGrossLosingTrade: {
          $avg: { $cond: [{ $lt: ["$grossPnl", 0] }, "$grossPnl", null] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        avgPnlWinningTrade: 1,
        avgPnlLosingTrade: 1,
        avgGrossWinningTrade: 1,
        avgGrossLosingTrade: 1,
      },
    },
  ]);

  return trades;
};

module.exports = avgWinningLosingTrade;
