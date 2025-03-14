function calculateNetROIWithCommission(transactions) {
  let sharesOwned = 0;
  let totalCost = 0;
  let totalRevenue = 0;
  let totalCommission = 0;

  transactions.forEach((transaction) => {
    let transactionCost =
      transaction.shares * transaction.price + transaction.commission;

    if (transaction.type === "sell") {
      totalRevenue += transactionCost;
      sharesOwned -= transaction.shares;
    } else if (transaction.type === "buy") {
      totalCost += transactionCost;
      sharesOwned += transaction.shares;
      totalCommission += transaction.commission;
    }
  });

  // Calculate net PnL
  let netPnL = totalRevenue - totalCost;
  let netPnLAdjusted = netPnL - totalCommission;

  // Calculate net ROI
  let netROI;
  if (totalCost !== 0) {
    netROI = (netPnLAdjusted / totalCost) * 100;
  } else {
    netROI = 0; // Avoid division by zero
  }

  return netROI;
}

module.exports = calculateNetROIWithCommission;
