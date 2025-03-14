const convertToNumber = require("../services/util/convertToNumber");

function createNewExecutions(executions) {
  const resultingTrades = [];
  let currentTradeSet = [];
  let netPosition = 0;

  let i = 0;
  const updatedTrades = executions;

  do {
    const trade = updatedTrades[i];
    let tradeNetPosition = netPosition;
    const quantity =
      trade?.side === "sell"
        ? -convertToNumber(trade?.quantity)
        : convertToNumber(trade?.quantity);
    tradeNetPosition += quantity;
    trade.commission = +trade?.commission || 0;
    trade.quantity = Math.abs(+quantity);
    currentTradeSet.push({
      ...trade,
      netPosition: tradeNetPosition,
    });

    // If net position becomes zero or it's the last trade, push the current trade set to resulting trades and reset current trade set
    if (tradeNetPosition === 0 || i === updatedTrades?.length - 1) {
      resultingTrades.push([...currentTradeSet]);
      currentTradeSet = [];
    }

    // Update net position for next iteration
    netPosition = tradeNetPosition;

    i++;
  } while (i < updatedTrades?.length);

  return resultingTrades;
}
const splitExecutions = (executions) => {
  let splitArray = [];
  let openPosition = 0;

  for (let x of executions) {
    let quantityNum = Number(x?.quantity);
    const sideValue = x?.side?.toLowerCase();

    if (sideValue === "buy") {
      // If there's a short position, offset it first
      if (openPosition < 0) {
        const offset = Math.min(quantityNum, Math.abs(openPosition));
        splitArray.push({
          ...x,
          quantity: offset,
        });
        openPosition += offset;
        quantityNum -= offset;
      }

      // Any remaining buy quantity
      if (quantityNum > 0) {
        splitArray.push({
          ...x,
          quantity: quantityNum,
        });
        openPosition += quantityNum;
      }
    } else if (sideValue === "sell") {
      // If there's a long position, offset it first
      if (openPosition > 0) {
        const offset = Math.min(quantityNum, openPosition);

        splitArray.push({
          ...x,
          quantity: offset,
        });
        openPosition -= offset;
        quantityNum -= offset;
      }

      // Any remaining sell quantity
      if (quantityNum > 0) {
        splitArray.push({
          ...x,
          quantity: quantityNum,
        });
        openPosition -= quantityNum;
      }
    }
  }

  return splitArray;
};

module.exports = { createNewExecutions, splitExecutions };
