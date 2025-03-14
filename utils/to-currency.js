function toCurrency(number, disableDecimal = false, decimalPlaces = 2) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: disableDecimal ? 0 : decimalPlaces,
    maximumFractionDigits: disableDecimal ? 0 : decimalPlaces,
  });
  return formatter.format(+number);
}

module.exports = toCurrency;
