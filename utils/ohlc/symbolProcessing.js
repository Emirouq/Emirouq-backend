// const data = require("./indexData.json");

function getCorrectSymbol(symbol) {
  // Split the symbol based on space
  // let tickerSymbol = symbol.split(" ")[0];
  // // Define a regex to check for month and option suffix (e.g., MAYP or MAYC)
  // const monthSuffixRegex =
  //   /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(P|C)$/;
  // // Remove the month and option suffix if it exists and the symbol is long enough to contain one
  // // if (monthSuffixRegex.test(tickerSymbol) && tickerSymbol.length > 4) {
  // //   tickerSymbol = tickerSymbol.replace(monthSuffixRegex, "");
  // // }
  // // Check if the tickerSymbol matches any symbol in indexSymbols array
  // for (let index of data) {
  //   // Remove '.INDX' from both symbols for comparison
  //   const cleanedIndexSymbol = index.symbol.replace(".INDX", "");
  //   if (tickerSymbol === cleanedIndexSymbol) {
  //     console.log("matched index: ", index.symbol);
  //     return { symbol: index.symbol, isIndex: true }; // Return the full symbol with '.INDX' suffix
  //   }
  // }
  // tickerSymbol = tickerSymbol.match(/[A-Z]+/g).join("");
  // // If symbol contains 'SPX', convert to 'GSPC.INDEX'
  // if (/SPX/i.test(tickerSymbol)) {
  //   tickerSymbol = "GSPC.INDX";
  //   return { symbol: tickerSymbol, isIndex: true }; // Return the processed tickerSymbol;
  // }
  // // If no match is found, return the processed tickerSymbol
  // return { symbol: tickerSymbol, isIndex: false }; // Return the processed tickerSymbol;
}

module.exports = getCorrectSymbol;
