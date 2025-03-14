function tradezellaNetRoiCommission(transactions) {
  // Calculate total cost including commissions
  let totalCost = transactions.reduce((prev, curr) => {
    if (curr?.type === "buy") {
      return (
        prev +
        parseFloat(curr?.shares) * parseFloat(curr?.price) +
        parseFloat(curr?.commission)
      );
    } else if (curr?.type === "sell") {
      return (
        prev +
        parseFloat(curr?.shares) * parseFloat(curr?.price) -
        parseFloat(curr?.commission)
      );
    }
  }, 0);

  // Calculate adjusted cost
  let adjustedCost = transactions.reduce((prev, curr) => {
    if (curr?.type === "buy") {
      return prev + parseFloat(curr?.shares) * parseFloat(curr?.price);
    }
    return prev;
  }, 0);

  // Calculate net profits
  let netProfits = transactions.reduce((prev, curr) => {
    if (curr?.type === "sell") {
      return (
        prev +
        parseFloat(curr?.shares) * parseFloat(curr?.price) -
        parseFloat(curr?.commission)
      );
    }
    return prev;
  }, 0);

  // Calculate initial investment
  let initialInvestment = totalCost;

  // Calculate ROI
  let netRoi =
    ((netProfits - (initialInvestment - adjustedCost)) / initialInvestment) *
    100;

  return netRoi;
}

module.exports = tradezellaNetRoiCommission;
