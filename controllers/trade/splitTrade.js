const AccountModel = require("../../models/Account.model");
const Trades = require("../../models/Trade.model");
const { save } = require("../../services/saveTrades/save");
const longCal = require("../../services/trade/longCal");
const shortCal = require("../../services/trade/shortCal");
const {
  splitExecutions,
  createNewExecutions,
} = require("../../utils/split-executions");
const splitTrades = async (req, res, next) => {
  try {
    const { tradeId } = req.params;
    const account = await AccountModel.findOne({ user: req.user.uuid });
    const singleTrade = await Trades.aggregate([
      {
        $match: {
          uuid: tradeId,
        },
      },
      {
        $lookup: {
          from: "executions",
          localField: "uuid",
          foreignField: "tradeId",
          as: "executions",
        },
      },
    ]);
    let split = [];
    for (let x of singleTrade) {
      const splitExecutionsResult = splitExecutions(x?.executions);
      //here we are creating trades from the executions when open position is 0
      const newTrades = createNewExecutions(splitExecutionsResult);
      split.push(...newTrades);
    }

    // await save({
    //   trades: [singleTrade?.[0]?.executions],
    //   tradeType: "stocks",
    //   brokerName: "interactiveBroker",
    //   userId: req.user.uuid,
    //   importVia: "brokerSync",
    //   timeZone: "America/New_York",
    //   account,
    //   symbol: singleTrade[0].symbol,
    //   longCal: longCal,
    //   shortCal: shortCal,
    //   fromSnap: false,
    // });

    res.json({
      message: "Fetched successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = splitTrades;
