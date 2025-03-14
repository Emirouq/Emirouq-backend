const dayjs = require("dayjs");

const groupTradesByAssetClass = (trades) => {
  const groupedTrades = {};
  trades.forEach((trade) => {
    const assetClass = trade.AssetClass;
    if (!groupedTrades[assetClass]) {
      groupedTrades[assetClass] = {};
    }
    const symbol = trade.Symbol;
    if (!groupedTrades[assetClass][symbol]) {
      groupedTrades[assetClass][symbol] = [];
    }

    groupedTrades[assetClass][symbol].push({
      ...trade,
      DateTime: dayjs(
        trade?.["DateTime"]?.replace(";", " "),
        "YYYYMMDD;HHmmss"
      ).format("YYYY-MM-DD HH:mm:ss"),
    });
  });
  return groupedTrades;
};

// Function to sort trades by DateTime
const sortTradesByDateTime = (trades) => {
  return trades.sort((a, b) => new Date(a.DateTime) - new Date(b.DateTime));
};

module.exports = { groupTradesByAssetClass, sortTradesByDateTime };
