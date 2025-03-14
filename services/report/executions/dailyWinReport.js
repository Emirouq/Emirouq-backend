const httpErrors = require("http-errors");
const Trade = require("../../../models/Trade.model");

const dailyWinReport = async ({
  accountIds,
  searchCriteria,
  searchCriteria2,
}) => {
  const trades = await Trade.aggregate([
    {
      $match: {
        accountId: { $in: accountIds.split(",") },
        ...searchCriteria2,
      },
    },
  ]);
  return trades;
};

module.exports = dailyWinReport;
