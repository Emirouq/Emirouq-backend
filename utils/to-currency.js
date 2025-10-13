// function toCurrency(number, disableDecimal = false, decimalPlaces = 2) {
//   const formatter = new Intl.NumberFormat("en-US", {
//     style: "currency",
//     currency: "USD",
//     minimumFractionDigits: disableDecimal ? 0 : decimalPlaces,
//     maximumFractionDigits: disableDecimal ? 0 : decimalPlaces,
//   });
//   return formatter.format(+number);
// }

// module.exports = toCurrency;

function toCurrency(number, disableDecimal = false, decimalPlaces = 2) {
  const formatter = new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: disableDecimal ? 0 : decimalPlaces,
    maximumFractionDigits: disableDecimal ? 0 : decimalPlaces,
  });
  return formatter.format(+number);
}

module.exports = toCurrency;
