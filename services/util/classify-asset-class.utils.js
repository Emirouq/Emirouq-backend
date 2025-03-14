function classifyAssetClass(symbol) {
  // Regular expressions (still simplified, as explained below)
  const optionRegex = /^\w{1,5}\d{6}[CP]\d{1,2}$/; // Highly simplified option regex
  const futuresRegex = /^\w{1,5}[A-Za-z]\d{2}$/; // Corrected futures regex to use month codes
  const stockRegex = /^[A-Z]{1,5}$/; //Simple regex for stocks, just for the test purpose
  if (optionRegex.test(symbol)) {
    return "option";
  } else if (futuresRegex.test(symbol)) {
    return "futures";
  } else if (stockRegex.test(symbol)) {
    return "stocks";
  } else {
    return "";
  }
}

module.exports = { classifyAssetClass };
