const groupTradesByAssetClass = (trades) => {
  const groupedTrades = {};
  trades.forEach((trade) => {
    const assetClass =
      trade.Strike || trade["Option type"] || trade.Expiration ? "OPT" : "STK";
    if (!groupedTrades[assetClass]) {
      groupedTrades[assetClass] = {};
    }
    const symbol = trade.UnderlyingSymbol || trade.Symbol;
    if (!groupedTrades[assetClass][symbol]) {
      groupedTrades[assetClass][symbol] = [];
    }

    groupedTrades[assetClass][symbol].push({
      ...trade,
    });
  });
  return groupedTrades;
};

// Function to sort trades by DateTime
const sortTradesByDateTime = (trades) => {
  return trades.sort(
    (a, b) => new Date(a["Updated time"]) - new Date(b["Updated time"])
  );
};

module.exports = { groupTradesByAssetClass, sortTradesByDateTime };
