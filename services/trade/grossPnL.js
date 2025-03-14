function grossPnL(transactions) {
  let sharesOwned = 0;
  let totalCost = 0;
  let totalRevenue = 0;

  transactions.forEach((transaction) => {
    if (transaction?.type === "sell") {
      let revenue = transaction?.shares * transaction?.price;
      totalRevenue += revenue;
      sharesOwned -= transaction?.shares;
    } else if (transaction?.type === "buy") {
      let cost = transaction?.shares * transaction?.price;
      totalCost += cost;
      sharesOwned += transaction?.shares;
    }
  });

  let netPnL =
    totalRevenue -
    totalCost +
    sharesOwned * transactions[transactions.length - 1].price;
  return netPnL;
}

module.exports = grossPnL;
