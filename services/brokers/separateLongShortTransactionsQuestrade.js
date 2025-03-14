const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);

const groupBy = (array) => {
  return array.reduce((result, item) => {
    const key = `${item["symbol"]}-${item?.date}`;
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
    return result;
  }, {});
};

// Helper function to sort an array by buy and sell
const sortBySide = (array, type) => {
  return array
    .sort((a, b) => {
      if (type === "long") {
        return a.side < b.side ? -1 : 1;
      } else {
        return a.side > b.side ? -1 : 1;
      }
    })
    ?.map((i, index) => {
      return {
        ...i,
        date: dayjs(i?.date).add(index, "s").toISOString(),
      };
    });
};
// Sort within each symbol group by date and price
const sortByType = (groupedTrades, side) => {
  const result = {};
  for (const [symbol, trades] of Object.entries(groupedTrades)) {
    result[symbol] = sortBySide(trades, side);
  }
  return result;
};

/**
 * @params {*} finalExecutionsList
 * This function makes separate finalExecutionsList for long and short types. This was required for snaptrade questrade syncing because timestamps were not accurate
 *
 */
const separateLongShortTransactionsQuestrade = (finalExecutionsList) => {
  // Split into Long and Short trades
  const longTrades = [];
  const allLongTradeIds = [];
  const shortTrades = [];
  const allShortTradeIds = [];
  finalExecutionsList.forEach((i) => {
    if (i.type === "long") {
      longTrades.push(i);
      allLongTradeIds.push(i.orderId);
    } else if (i.type === "short") {
      shortTrades.push(i);
      allShortTradeIds.push(i.orderId);
    }
  });
  // Group by Symbol
  const longTradesGroupedBySymbol = groupBy(longTrades, "symbol");
  const shortTradesGroupedBySymbol = groupBy(shortTrades, "symbol");

  // Sort Long trades in ascending order by date and price, Short trades in descending order
  const sortedLongTradesGroupedBySymbol = sortByType(
    longTradesGroupedBySymbol,
    "long"
  );
  const sortedShortTradesGroupedBySymbol = sortByType(
    shortTradesGroupedBySymbol,
    "short"
  );

  const longFinalExecutions = Object.values(
    sortedLongTradesGroupedBySymbol
  ).flat();
  const shortFinalExecutions = Object.values(
    sortedShortTradesGroupedBySymbol
  ).flat();

  return {
    long: {
      finalExecutionsList: longFinalExecutions,
      allLongTradeIds,
    },
    short: {
      finalExecutionsList: shortFinalExecutions,
      allShortTradeIds,
    },
  };
};

module.exports = separateLongShortTransactionsQuestrade;
