function calculateNetPnLWithCommission(transactions) {
  let sharesOwned = 0;
  let totalCost = 0;
  let totalRevenue = 0;

  transactions.forEach((transaction) => {
    let transactionCost = transaction.shares * transaction.price;

    if (transaction.type === "sell") {
      let transactionRevenue = transactionCost - transaction?.commission;
      totalRevenue += transactionRevenue;
      sharesOwned -= transaction.shares;
    } else if (transaction.type === "buy") {
      transactionCost += transaction?.commission;
      totalCost += transactionCost;
      sharesOwned += transaction.shares;
    }
  });

  let netPnL =
    totalRevenue -
    totalCost +
    sharesOwned * transactions[transactions.length - 1].price;
  return netPnL;
}

module.exports = calculateNetPnLWithCommission;
