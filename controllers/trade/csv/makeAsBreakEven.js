const Trades = require("../../../models/Trade.model");

const makeAsBreakEven = async (req, res, next) => {
  try {
    const { tradeId } = req.params;
    const { breakEven } = req.body;
    const trade = await Trades.findOne({
      uuid: tradeId,
    });
    if (!trade) {
      throw new Error("Trade not found");
    }
    await Trades.findOneAndUpdate(
      {
        uuid: tradeId,
      },
      {
        $set: {
          breakEven,
        },
      },
      {
        new: true,
      }
    );
    res.json({
      message: "Fetched successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = makeAsBreakEven;
