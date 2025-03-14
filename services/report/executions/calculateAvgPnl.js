const httpErrors = require("http-errors");
const Execution = require("../../../models/Execution.model");

const calculateAvgPnl = async ({
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
  ]);

  return trades;
};

module.exports = calculateAvgPnl;
