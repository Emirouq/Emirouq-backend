const httpErrors = require("http-errors");
const Trade = require("../../models/Trade.model");

const getOverallReport = async ({ accountIds, searchCriteria }) => {
  const trades = await Trade.aggregate([
    {
      $match: {
        accountId: { $in: accountIds?.split(",") },
        ...searchCriteria,
      },
    },
    // firstly we will set the year, month and day of the trade for grouping purpose
    // and then we will set the pnlProfit, pnlLoss, grossProfit, grossLoss on individual trade
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
            {
              $cond: [{ $gte: ["$fifo.grossPnl", 0] }, "$fifo.grossPnl", 0],
            },
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
      },
    },
    {
      $sort: {
        openDate: 1,
      },
    },
    // now we will group the trades by year and month
    {
      $group: {
        _id: {
          year: "$year",
          month: "$month",
        },
        // we will find the month name and year name
        monthName: { $first: "$month" },
        yearName: { $first: "$year" },
        // calculate total trade for the month
        totalTrades: { $sum: 1 },
        // calculate winning trades, losing trades and break even trades
        winningTrades: {
          $sum: {
            $cond: [{ $gt: ["$pnlProfit", 0] }, 1, 0],
          },
        },
        losingTrades: { $sum: { $cond: [{ $lt: ["$pnlLoss", 0] }, 1, 0] } },
        breakEvenTrade: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $eq: ["$pnlProfit", 0],
                  },
                  {
                    $eq: ["$pnlLoss", 0],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
        // calculate total commission, pnlProfit, pnlLoss, grossProfit, grossLoss
        totalCommission: { $sum: "$totalCommission" },
        pnlProfit: { $sum: "$pnlProfit" },
        pnlLoss: { $sum: "$pnlLoss" },
        grossProfit: { $sum: "$grossProfit" },
        grossLoss: { $sum: "$grossLoss" },
        // calculate pnlProfitLoss and grossProfitLoss
        pnlProfitLoss: { $sum: { $add: ["$pnlProfit", "$pnlLoss"] } },
        grossProfitLoss: { $sum: { $add: ["$grossProfit", "$grossLoss"] } },
        // find the largest pnlProfit, pnlLoss, grossProfit, grossLoss
        largestPnlProfit: { $max: "$pnlProfit" },
        largestPnlLoss: { $min: "$pnlLoss" },
        largestGrossProfit: { $max: "$grossProfit" },
        largestGrossLoss: { $min: "$grossLoss" },
      },
    },
    // now we will group all the trades as _id as null
    // after assigning _id as null then we can find the overall reports , for the array of trades we have got from above
    {
      $group: {
        _id: null,
        bestPnl: {
          $max: {
            value: "$pnlProfitLoss",
            month: "$monthName",
            year: "$yearName",
          },
        },
        lowestPnl: {
          $min: {
            value: "$pnlProfitLoss",
            month: "$monthName",
            year: "$yearName",
          },
        },
        avgPnl: { $avg: "$pnlProfitLoss" },

        bestGross: {
          $max: {
            value: "$grossProfitLoss",
            month: "$monthName",
            year: "$yearName",
          },
        },
        lowestGross: {
          $min: {
            value: "$grossProfitLoss",
            month: "$monthName",
            year: "$yearName",
          },
        },
        avgGross: { $avg: "$grossProfitLoss" },
        totalPnL: { $sum: "$pnlProfitLoss" },
        totalGross: { $sum: "$grossProfitLoss" },
        totalTrades: { $sum: "$totalTrades" },
        winningTrades: { $sum: "$winningTrades" },
        losingTrades: { $sum: "$losingTrades" },
        breakEvenTrade: { $sum: "$breakEvenTrade" },
        totalCommission: {
          $sum: "$totalCommission",
        },
        largestPnlProfit: { $max: "$largestPnlProfit" },
        largestPnlLoss: { $min: "$largestPnlLoss" },
        largestGrossProfit: { $max: "$largestGrossProfit" },
        largestGrossLoss: { $min: "$largestGrossLoss" },
      },
    },
  ]);

  return trades;
};

module.exports = getOverallReport;
