function grossRoI(transactions) {
  let sharesOwned = 0;
  let totalCost = 0;
  let totalRevenue = 0;

  transactions.forEach((transaction) => {
    if (transaction.type === "sell") {
      let revenue = transaction.shares * transaction.price;
      totalRevenue += revenue;
      sharesOwned -= transaction.shares;
    } else if (transaction.type === "buy") {
      let cost = transaction.shares * transaction.price;
      totalCost += cost;
      sharesOwned += transaction.shares;
    }
  });

  let netProfitLoss = totalRevenue - totalCost;
  let netROI = (netProfitLoss / totalCost) * 100;
  return netROI;
}

module.exports = grossRoI;
