const Trades = require("../../models/Trade.model");

const existTrade = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { accountId, tradeType } = req.query;
    const data = await Trades.find({
      symbol: symbol,
      accountId: accountId,
      tradeType: tradeType,
      status: "open",
    });

    res.json({
      message: "Fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = existTrade;
