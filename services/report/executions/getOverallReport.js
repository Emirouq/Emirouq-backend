const httpErrors = require("http-errors");
const Execution = require("../../../models/Execution.model");

const getOverallReport = async ({
  accountIds,
  searchCriteria,
  searchCriteria2,
}) => {
  const trades = await Execution.aggregate([
    {
      $match: {
        accountId: { $in: accountIds?.split(",") },
        ...searchCriteria2,
      },
    },
    {
      $set: {
        year: { $year: "$date" },
        month: { $month: "$date" },
        day: { $dayOfMonth: "$date" },
      },
    },
    {
      $set: {
        netPnl: {
          $cond: [
            { $eq: ["$calculationMethod", "fifo"] },
            { $subtract: ["$fifo.profits", "$commission"] },
            { $subtract: ["$wa.profits", "$commission"] },
          ],
        },
        grossPnl: {
          $cond: [
            { $eq: ["$calculationMethod", "fifo"] },
            "$fifo.profits",
            "$wa.profits",
          ],
        },
      },
    },
    {
      $set: {
        totalPnlProfit: {
          $sum: {
            $cond: [{ $gt: ["$netPnl", 0] }, "$netPnl", 0],
          },
        },
        totalPnlLoss: {
          $sum: {
            $cond: [{ $lt: ["$netPnl", 0] }, "$netPnl", 0],
          },
        },
        totalGrossProfit: {
          $sum: {
            $cond: [{ $gt: ["$grossPnl", 0] }, "$grossPnl", 0],
          },
        },
        totalGrossLoss: {
          $sum: {
            $cond: [{ $lt: ["$grossPnl", 0] }, "$grossPnl", 0],
          },
        },
      },
    },
    {
      $lookup: {
        from: "trades",
        localField: "_id",
        foreignField: "uuid",
        as: "trade",
      },
    },
    {
      $unwind: {
        path: "$trade",
      },
    },
    {
      $match: searchCriteria,
    },

    {
      $group: {
        _id: {
          year: "$year",
          month: "$month",
        },
        // we will find the month name and year name
        totalExecutions: { $sum: 1 },
        monthName: { $first: "$month" },
        yearName: { $first: "$year" },
        pnlProfit: { $sum: "$totalPnlProfit" },
        pnlLoss: { $sum: "$totalPnlLoss" },
        grossProfit: { $sum: "$totalGrossProfit" },
        grossLoss: { $sum: "$totalGrossLoss" },
        // calculate netPnlProfitLoss and grossPnlProfitLoss
        netPnlProfitLoss: {
          $sum: { $add: ["$totalPnlProfit", "$totalPnlLoss"] },
        },
        grossPnlProfitLoss: {
          $sum: { $add: ["$totalGrossProfit", "$totalGrossLoss"] },
        },
        // find the largest pnlProfit, pnlLoss, grossProfit, grossLoss
        // largestPnlProfit: { $max: "$totalPnlProfit" },
        // largestPnlLoss: { $min: "$totalPnlLoss" },
        // largestGrossProfit: { $max: "$totalGrossProfit" },
        // largestGrossLoss: { $min: "$totalGrossLoss" },
      },
    },

    {
      $group: {
        _id: null,
        avgMonthlyNetPnl: {
          $avg: "$netPnlProfitLoss",
        },
        avgGrossMonthlyPnl: {
          $avg: "$grossPnlProfitLoss",
        },
        bestPnl: {
          $max: {
            value: "$netPnlProfitLoss",
            month: "$monthName",
            year: "$yearName",
          },
        },
        lowestPnl: {
          $min: {
            value: "$netPnlProfitLoss",
            month: "$monthName",
            year: "$yearName",
          },
        },
        bestGross: {
          $max: {
            value: "$grossPnlProfitLoss",
            month: "$monthName",
            year: "$yearName",
          },
        },
        lowestGross: {
          $min: {
            value: "$grossPnlProfitLoss",
            month: "$monthName",
            year: "$yearName",
          },
        },
        totalPnL: { $sum: "$netPnlProfitLoss" },
        totalGross: { $sum: "$grossPnlProfitLoss" },
      },
    },
  ]);

  return trades;
};

module.exports = getOverallReport;
