// const httpErrors = require("http-errors");
const Trades = require("../../models/Trade.model");
const Executions = require("../../models/Execution.model");

const deleteTrade = async (req, res, next) => {
  try {
    const { ids, deleteAll, accountIds } = req.body;
    if (deleteAll && accountIds?.length > 0) {
      await Promise.all([
        Trades.deleteMany({
          accountId: {
            $in: accountIds,
          },
        }),
        Executions.deleteMany({
          accountId: {
            $in: accountIds,
          },
        }),
      ]);
    } else {
      await Promise.all([
        Trades.deleteMany({
          uuid: {
            $in: ids,
          },
        }),
        // delete all executions related to the trade
        Executions.deleteMany({
          tradeId: {
            $in: ids,
          },
        }),
      ]);
    }

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = deleteTrade;
