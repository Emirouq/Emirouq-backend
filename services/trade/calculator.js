const { minMaxDate } = require("./findMinAndMax");
// const calculateNetPnLWithCommission = require("./calculateNetPnlWithCommision");
// const calculateNetROIWithCommission = require("./calculateNetROIWithCommission");
// const tradezellaNetRoiCommission = require("./tradezellaNetRoiCommission");
const calculator = async ({ trade, executionList }) => {
  // calculate total execution
  trade.executions = executionList?.map((x) => x?.uuid);
  // calculate total quantity
  trade.totalQuantity = executionList?.reduce((acc, x) => acc + x?.quantity, 0);
  // calculate total commission
  trade.totalCommission = executionList
    ?.reduce((acc, x) => acc + x?.commission, 0)
    ?.toFixed(2);
  // calculate total buy and sell amount
  trade.totalBuyAmount = executionList
    ?.reduce((acc, x) => {
      return x?.side === "buy" ? acc + x?.price * x?.quantity : acc;
    }, 0)
    ?.toFixed(2);
  trade.totalSellAmount = executionList
    ?.reduce((acc, x) => {
      return x?.side === "sell" ? acc + x?.price * x?.quantity : acc;
    }, 0)
    ?.toFixed(2);

  //calculate open and close date
  const dates = executionList?.map((x) => {
    return x?.date;
  });
  const openCloseDate = minMaxDate({
    dates: dates,
  });
  // calculate entry and exit price
  trade.entryPrice = executionList?.[0]?.price?.toFixed(2);
  trade.openDate = openCloseDate?.openDate;
  // if trade has more than one execution and has a sell side then it is a close trade and we can calculate exit price

  // calculate average entry price
  trade.avgEntryPrice = trade.totalBuyAmount / trade.totalQuantity;
  // calculate net pnl and net roi
  // let transactions = executionList?.map((x) => {
  //   return {
  //     type: x?.side,
  //     shares: x?.quantity,
  //     price: x?.price,
  //     commission: +x?.commission,
  //   };
  // });

  // let netPnl = calculateNetPnLWithCommission(transactions);
  // let netRoi = tradezellaNetRoiCommission(transactions);

  if (trade.totalQuantity === 0) {
    trade.closeDate = openCloseDate?.closeDate;
    // trade.netPnl = netPnl?.toFixed(2);
  }
  if (executionList?.length > 1) {
    trade.exitPrice = executionList?.[executionList?.length - 1]?.price;
  }
  // trade.netRoi = netRoi?.toFixed(2);
  // calculate trade status
  // trade.status =
  // trade.totalSellAmount === 0 ? "open" : netPnl >= 0 ? "win" : "loss";
  // calculate trade side , if first execution quantity is greater than 0 then it is a long trade otherwise short trade
  // trade.side = executionList?.[0]?.quantity > 0 ? "long" : "short";
  return trade;
};
module.exports = calculator;
