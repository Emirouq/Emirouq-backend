const { round } = require("lodash");

const realizeMultipleService = async ({
  profitTarget,
  stopLoss,
  avgEntryPrice,
  totalQuantity,
  totalCommission,
  avgExitPrice,
  side,
  pnl,
  contractMultiplier,
}) => {
  let singleTrade = {
    avgEntryPrice: +avgEntryPrice,
    avgExitPrice: +avgExitPrice,
    totalQuantity: +totalQuantity,
    totalCommission: +totalCommission,
    side,
    profitTarget: +profitTarget,
    stopLoss: +stopLoss,
    initialTarget: 0,
    tradeRisk: 0,
    plannedRMultiple: 0,
    realizeRMultiple: 0,
    contractMultiplier: +contractMultiplier,
    pnl: +pnl,
  };
  try {
    // if profit target or stop loss is passed  then return
    if (
      !!singleTrade?.profitTarget === false ||
      !!singleTrade?.stopLoss === false
    ) {
      singleTrade.initialTarget = 0;
      singleTrade.tradeRisk = 0;
      singleTrade.plannedRMultiple = 0;
      singleTrade.realizeRMultiple = 0;
      singleTrade.profitTarget = 0;
      singleTrade.stopLoss = 0;
      return singleTrade;
    }
    //in case of short if stop loss is less than avg entry price then return
    if (
      singleTrade?.stopLoss < singleTrade?.avgEntryPrice &&
      side === "short"
    ) {
      singleTrade.initialTarget = 0;
      singleTrade.tradeRisk = 0;
      singleTrade.plannedRMultiple = 0;
      singleTrade.realizeRMultiple = 0;
      singleTrade.profitTarget = profitTarget;
      singleTrade.stopLoss = stopLoss;
      return singleTrade;
    }
    // in case of long if stop loss is greater than avg entry price or profit target is less than avg entry price then return
    if (singleTrade?.stopLoss > singleTrade?.avgEntryPrice && side === "long") {
      singleTrade.initialTarget = 0;
      singleTrade.tradeRisk = 0;
      singleTrade.plannedRMultiple = 0;
      singleTrade.realizeRMultiple = 0;
      singleTrade.profitTarget = profitTarget;
      singleTrade.stopLoss = stopLoss;
      return singleTrade;
    }

    // if profit target and stop loss are passed then calculate the values
    if (!!singleTrade?.profitTarget && !!singleTrade?.stopLoss) {
      const entryStopLossPrice =
        // singleTrade?.side === "long"
        //   ? round(+stopLoss - +singleTrade?.avgEntryPrice, 2)
        //   :
        Math.abs(round(singleTrade?.avgEntryPrice - singleTrade?.stopLoss, 2));

      // This check calculates the initial target value based on the trade's side (long or short).
      // For long trades, it calculates the profit target by subtracting the average entry price from the profit target,
      // multiplying by the total quantity, and then by the contract multiplier.
      // For short trades, it calculates the profit target by subtracting the profit target from the average entry price,
      // multiplying by the total quantity, and then by the contract multiplier.
      // it helps us to  identify the +ve or -ve value of initial target
      const initialTarget =
        singleTrade?.side === "long"
          ? round(
              (singleTrade?.profitTarget - +singleTrade?.avgEntryPrice) *
                singleTrade?.totalQuantity,
              2
            ) * contractMultiplier
          : round(
              (singleTrade?.avgEntryPrice - singleTrade?.profitTarget) *
                singleTrade?.totalQuantity,
              2
            ) * contractMultiplier;

      // trade risk is the product of entry stop loss price and total quantity
      const tradeRisk = Math.abs(
        round(entryStopLossPrice * singleTrade?.totalQuantity, 2) *
          contractMultiplier
      );
      // planned r multiple is the ratio of initial target and trade risk
      const plannedRMultiple = Math.abs(round(initialTarget / +tradeRisk, 2));
      // realizer r multiple is the ratio of  (exit price - entry price - commission) and entry stop loss price
      const realizeRMultiple = Math.abs(round(singleTrade?.pnl / tradeRisk, 2));
      singleTrade.initialTarget = initialTarget;
      singleTrade.tradeRisk = -tradeRisk;
      singleTrade.plannedRMultiple = plannedRMultiple;
      // if trade is profitable then realizeRMultiple will be positive else negative
      singleTrade.realizeRMultiple =
        singleTrade?.pnl > 0 ? realizeRMultiple : -realizeRMultiple;
      singleTrade.profitTarget = profitTarget;
      singleTrade.stopLoss = stopLoss;
      return singleTrade;
    }
  } catch (error) {
    throw error;
  }
};

module.exports = realizeMultipleService;
