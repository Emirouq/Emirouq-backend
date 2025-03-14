const Trades = require("../../models/Trade.model");
const realizeMultipleService = require("../../services/trade/realize-multiple.service");
const realizeMultiple = async (req, res, next) => {
  try {
    const { tradeId } = req.params;
    const singleTrade = await Trades.findOne({
      uuid: tradeId,
    });
    if (!singleTrade) {
      throw new Error("Trade not found");
    }
    const { profitTarget, stopLoss } = req.body;
    const {
      initialTarget,
      tradeRisk,
      plannedRMultiple,
      realizeRMultiple,
      profitTarget: newProfitTarget,
      stopLoss: newStopLoss,
    } = await realizeMultipleService({
      profitTarget,
      stopLoss,
      avgEntryPrice: singleTrade?.avgEntryPrice,
      totalQuantity: singleTrade?.totalQuantity,
      totalCommission: singleTrade?.totalCommission,
      avgExitPrice: singleTrade?.avgExitPrice ? singleTrade?.avgExitPrice : 0,
      side: singleTrade?.side?.toLowerCase(),
      pnl: singleTrade?.[singleTrade?.calculationMethod]?.netPnl,
      contractMultiplier: singleTrade?.contractMultiplier
        ? singleTrade?.contractMultiplier
        : 1,
    });
    singleTrade.profitTarget = newProfitTarget;
    singleTrade.stopLoss = newStopLoss;
    singleTrade.initialTarget = initialTarget;
    singleTrade.tradeRisk = tradeRisk;
    singleTrade.plannedRMultiple = plannedRMultiple;
    singleTrade.realizeRMultiple = realizeRMultiple;
    await singleTrade.save();
    res.json({
      message: "Fetched successfully",
      data: singleTrade,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = realizeMultiple;
