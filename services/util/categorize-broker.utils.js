const snap_brokerage_master = require("../../config/snap_brokerage_master.json");

function categorizeBroker(string) {
  if (string?.toLowerCase()?.includes("wealthsimple")) {
    return "wealthsimple";
  }
  if (string?.toLowerCase()?.includes("upstox")) {
    return "upstox";
  }

  if (string?.toLowerCase()?.includes("fidelity")) {
    return "fidelity";
  }
  if (string?.toLowerCase()?.includes("questrade")) {
    return "questrade";
  }
  if (string?.toLowerCase()?.includes("trading212")) {
    return "trading212";
  }
  if (string?.toLowerCase()?.includes("commsec")) {
    return "commsec";
  }
  if (string?.toLowerCase()?.includes("bux")) {
    return "bux";
  }

  if (string?.toLowerCase()?.includes("webull")) {
    return "webull";
  }
  if (string?.toLowerCase()?.includes("robinhood")) {
    return "robinhood";
  }
  if (string?.toLowerCase()?.includes("tradeStation")) {
    return "tradeStation";
  }
  if (string?.toLowerCase()?.includes("alpaca")) {
    return "alpaca";
  }
  if (string?.toLowerCase()?.includes("binance")) {
    return "binance";
  }
  if (string?.toLowerCase()?.includes("kraken")) {
    return "kraken";
  }
  if (string?.toLowerCase()?.includes("tradier")) {
    return "tradier";
  }
  if (string?.toLowerCase()?.includes("vanguard")) {
    return "vanguard";
  }
  if (string?.toLowerCase()?.includes("etrade")) {
    return "etrade";
  }
  if (string?.toLowerCase()?.includes("schwab")) {
    return "schwab";
  }
  if (string?.toLowerCase()?.includes("zerodha")) {
    return "zerodha";
  }
  if (string?.toLowerCase()?.includes("degiro")) {
    return "degiro";
  }
  if (string?.toLowerCase()?.includes("coinbase")) {
    return "coinbase";
  }
  if (string?.toLowerCase()?.includes("unocoin")) {
    return "unocoin";
  }
  if (string?.toLowerCase()?.includes("tradeStation")) {
    return "tradeStation";
  }
  // since stake is a common word, we need to check it by itself
  if (string?.toLowerCase() === "stakeaus") {
    return "stakeaus";
  }
  if (string?.toLowerCase() === "stake") {
    return "stake";
  }
}

module.exports = categorizeBroker;
