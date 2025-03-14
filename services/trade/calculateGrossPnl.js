// Define a function to calculate the gross PnL
function calculateGrossPnl(execution, previousExecutions) {
  // Calculate the total cost of the trade
  const totalCost = execution.quantity * execution.price;

  // Calculate the total proceeds of the trade
  const totalProceeds = previousExecutions.reduce((total, prevExec) => {
    const value =
      prevExec.type === "buy"
        ? -prevExec.shares * prevExec.price
        : prevExec.shares * prevExec.price;
    return total + value;
  }, 0);

  // Calculate the gross PnL
  const grossPnl = totalProceeds - totalCost;

  return grossPnl;
}

module.exports = calculateGrossPnl;
