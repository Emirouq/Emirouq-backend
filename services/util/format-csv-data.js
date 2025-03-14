// this function is created to reduce the memory usage of the application
// since const variables are stored in memory

const dayjs = require("dayjs");
const convertToNumber = require("./convertToNumber");

const formatETradeCsv = (data, key, originalKey) => {
  switch (key) {
    case "symbol":
      return data?.[originalKey];
    case "date":
      return dayjs(data?.[originalKey], "YYYY-MM-DD HH:mm:ss")?.toISOString();
    case "quantity":
      return Math.abs(
        convertToNumber(data?.[originalKey]?.split("@")?.[0]?.trim())
      );
    case "price":
      return Math.abs(
        convertToNumber(data?.[originalKey]?.split("@")?.[1]?.trim())
      );
    case "assetClass":
      return data?.[originalKey]?.split(" ")?.includes("Puts") ||
        data?.[originalKey]?.split(" ")?.includes("Calls")
        ? "option"
        : "stocks";
    case "orderId":
      return data?.[originalKey];
    case "side":
      return data[originalKey]?.split(" ")?.[0].toLowerCase();
    case "instrument":
      return data?.[originalKey]?.split(" ")?.includes("Puts") ? "put" : "call";
    default:
      return data?.[key];
  }
};
const formatWebullCsv = (data, key, originalKey) => {
  switch (key) {
    case "symbol":
      return data?.[originalKey];
    case "underlyingSymbol":
      return data[originalKey]?.split(" ")[0];
    case "date":
      return dayjs(data?.[originalKey], "YYYY-MM-DD HH:mm:ss")?.toISOString();
    case "quantity":
      return Math.abs(
        convertToNumber(data?.[originalKey]?.split("@")?.[0]?.trim())
      );
    case "price":
      return Math.abs(
        convertToNumber(data?.[originalKey]?.split("@")?.[1]?.trim())
      );
    case "assetClass":
      return data?.[originalKey]?.split(" ")?.includes("Put") ||
        data?.[originalKey]?.split(" ")?.includes("Call")
        ? "option"
        : "stocks";
    case "orderId":
      return `${data["Name"]?.split(" ")[0]}${data[
        "Side"
      ]?.toLowerCase()}${Math.abs(convertToNumber(data["Filled"]))}${Math.abs(
        convertToNumber(data["Price"])
      )}${dayjs(data?.[originalKey], "YYYY-MM-DD HH:mm:ss")?.toISOString()}`;
    case "side":
      return data[originalKey]?.toLowerCase();
    case "instrument":
      return data?.[originalKey]?.split(" ")?.includes("Put") ? "put" : "call";
    default:
      return data?.[key];
  }
};
const getFuturePointValue = [
  {
    symbol: "ES",
    exchange: "CME",
    name: "E-mini S&P 500",
    type: "Index Futures",
    tickSize: 0.25,
    tickValue: 12.5,
    pointValue: 50,
    margin: 11000,
    contractMonths: "Mar, Jun, Sep, Dec",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "One of the most liquid futures contracts in the world",
  },
  {
    symbol: "MES",
    exchange: "CME",
    name: "E-mini S&P 500",
    type: "Index Futures",
    tickSize: 0.25,
    tickValue: 12.5,
    pointValue: 5,
    margin: 11000,
    contractMonths: "Mar, Jun, Sep, Dec",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "One of the most liquid futures contracts in the world",
  },
  {
    symbol: "MNQ",
    exchange: "CME",
    name: "E-mini S&P 500",
    type: "Index Futures",
    tickSize: 0.25,
    tickValue: 12.5,
    pointValue: 2,
    margin: 11000,
    contractMonths: "Mar, Jun, Sep, Dec",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "One of the most liquid futures contracts in the world",
  },
  {
    symbol: "NQ",
    exchange: "CME",
    name: "E-mini Nasdaq 100",
    type: "Index Futures",
    tickSize: 0.25,
    tickValue: 5,
    pointValue: 20,
    margin: 16300,
    contractMonths: "Mar, Jun, Sep, Dec",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "Tracks 100 largest non-financial companies on Nasdaq",
  },
  {
    symbol: "YM",
    exchange: "CBOT",
    name: "E-mini Dow Jones Industrial Average",
    type: "Index Futures",
    tickSize: 1,
    tickValue: 5,
    pointValue: 5,
    margin: 8300,
    contractMonths: "Mar, Jun, Sep, Dec",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "Price-weighted average of 30 blue-chip US stocks",
  },
  {
    symbol: "RTY",
    exchange: "CME",
    name: "E-mini Russell 2000",
    type: "Index Futures",
    tickSize: 0.1,
    tickValue: 5,
    pointValue: 50,
    margin: 6600,
    contractMonths: "Mar, Jun, Sep, Dec",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "Tracks 2000 small-cap US companies",
  },
  {
    symbol: "CL",
    exchange: "NYMEX",
    name: "Crude Oil",
    type: "Energy",
    tickSize: 0.01,
    tickValue: 10,
    pointValue: 1000,
    margin: 6800,
    contractMonths: "All",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "WTI Light Sweet Crude Oil",
  },
  {
    symbol: "NG",
    exchange: "NYMEX",
    name: "Natural Gas",
    type: "Energy",
    tickSize: 0.005,
    tickValue: 50,
    pointValue: 10000,
    margin: 5800,
    contractMonths: "All",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "Henry Hub Natural Gas",
  },
  {
    symbol: "GC",
    exchange: "COMEX",
    name: "Gold",
    type: "Metals",
    tickSize: 0.1,
    tickValue: 10,
    pointValue: 100,
    margin: 7200,
    contractMonths: "Feb, Apr, Jun, Aug, Dec",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "100 troy ounces",
  },
  {
    symbol: "SI",
    exchange: "COMEX",
    name: "Silver",
    type: "Metals",
    tickSize: 0.005,
    tickValue: 25,
    pointValue: 5000,
    margin: 9500,
    contractMonths: "Mar, May, Jul, Sep, Dec",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "5000 troy ounces",
  },
  {
    symbol: "ZB",
    exchange: "CBOT",
    name: "US Treasury Bond",
    type: "Interest Rates",
    tickSize: 0.03125,
    tickValue: 31.25,
    pointValue: 1000,
    margin: 3200,
    contractMonths: "Mar, Jun, Sep, Dec",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "US Treasury Bond with >15 years to maturity",
  },
  {
    symbol: "ZN",
    exchange: "CBOT",
    name: "10-Year US Treasury Note",
    type: "Interest Rates",
    tickSize: 0.015625,
    tickValue: 15.625,
    pointValue: 1000,
    margin: 2200,
    contractMonths: "Mar, Jun, Sep, Dec",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "US Treasury Note with 6.5-10 years to maturity",
  },
  {
    symbol: "ZF",
    exchange: "CBOT",
    name: "5-Year US Treasury Note",
    type: "Interest Rates",
    tickSize: 0.0078125,
    tickValue: 7.8125,
    pointValue: 1000,
    margin: 1400,
    contractMonths: "Mar, Jun, Sep, Dec",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "US Treasury Note with 4.25-5 years to maturity",
  },
  {
    symbol: "ZT",
    exchange: "CBOT",
    name: "2-Year US Treasury Note",
    type: "Interest Rates",
    tickSize: 0.00390625,
    tickValue: 3.90625,
    pointValue: 1000,
    margin: 880,
    contractMonths: "Mar, Jun, Sep, Dec",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "US Treasury Note with 1.75-2 years to maturity",
  },
  {
    symbol: "ZC",
    exchange: "CBOT",
    name: "Corn",
    type: "Agricultural",
    tickSize: 0.25,
    tickValue: 12.5,
    pointValue: 50,
    margin: 1500,
    contractMonths: "Mar, May, Jul, Sep, Dec",
    tradingHours: "Sun-Fri 8:00pm-1:45pm ET",
    notes: "5000 bushels",
  },
  {
    symbol: "ZS",
    exchange: "CBOT",
    name: "Soybeans",
    type: "Agricultural",
    tickSize: 0.25,
    tickValue: 12.5,
    pointValue: 50,
    margin: 3500,
    contractMonths: "Jan, Mar, May, Jul, Aug, Sep, Nov",
    tradingHours: "Sun-Fri 8:00pm-1:45pm ET",
    notes: "5000 bushels",
  },
  {
    symbol: "ZW",
    exchange: "CBOT",
    name: "Wheat",
    type: "Agricultural",
    tickSize: 0.25,
    tickValue: 12.5,
    pointValue: 50,
    margin: 2000,
    contractMonths: "Mar, May, Jul, Sep, Dec",
    tradingHours: "Sun-Fri 8:00pm-1:45pm ET",
    notes: "5000 bushels",
  },
  {
    symbol: "ZM",
    exchange: "CBOT",
    name: "Soybean Meal",
    type: "Agricultural",
    tickSize: 0.1,
    tickValue: 10,
    pointValue: 100,
    margin: 2500,
    contractMonths: "Jan, Mar, May, Jul, Aug, Sep, Oct, Dec",
    tradingHours: "Sun-Fri 8:00pm-1:45pm ET",
    notes: "100 tons",
  },
  {
    symbol: "ZL",
    exchange: "CBOT",
    name: "Soybean Oil",
    type: "Agricultural",
    tickSize: 0.01,
    tickValue: 6,
    pointValue: 600,
    margin: 2000,
    contractMonths: "Jan, Mar, May, Jul, Aug, Sep, Oct, Dec",
    tradingHours: "Sun-Fri 8:00pm-1:45pm ET",
    notes: "60,000 pounds",
  },
  {
    symbol: "HG",
    exchange: "COMEX",
    name: "Copper",
    type: "Metals",
    tickSize: 0.05,
    tickValue: 12.5,
    pointValue: 250,
    margin: 3200,
    contractMonths: "All",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "25,000 pounds",
  },
  {
    symbol: "LE",
    exchange: "CME",
    name: "Live Cattle",
    type: "Livestock",
    tickSize: 0.025,
    tickValue: 10,
    pointValue: 400,
    margin: 2200,
    contractMonths: "Feb, Apr, Jun, Aug, Oct, Dec",
    tradingHours: "Mon-Fri 9:30am-2:05pm ET",
    notes: "40,000 pounds",
  },
  {
    symbol: "HE",
    exchange: "CME",
    name: "Lean Hogs",
    type: "Livestock",
    tickSize: 0.025,
    tickValue: 10,
    pointValue: 400,
    margin: 2600,
    contractMonths: "Feb, Apr, May, Jun, Jul, Aug, Oct, Dec",
    tradingHours: "Mon-Fri 9:30am-2:05pm ET",
    notes: "40,000 pounds",
  },
  {
    symbol: "6E",
    exchange: "CME",
    name: "Euro FX",
    type: "Currency",
    tickSize: 0.00005,
    tickValue: 6.25,
    pointValue: 125000,
    margin: 3100,
    contractMonths: "Mar, Jun, Sep, Dec",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "125,000 Euro",
  },
  {
    symbol: "6J",
    exchange: "CME",
    name: "Japanese Yen",
    type: "Currency",
    tickSize: 0.0000005,
    tickValue: 6.25,
    pointValue: 12500000,
    margin: 3000,
    contractMonths: "Mar, Jun, Sep, Dec",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "12,500,000 Yen",
  },
  {
    symbol: "6B",
    exchange: "CME",
    name: "British Pound",
    type: "Currency",
    tickSize: 0.0001,
    tickValue: 6.25,
    pointValue: 62500,
    margin: 3000,
    contractMonths: "Mar, Jun, Sep, Dec",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "62,500 Pounds",
  },
  {
    symbol: "6A",
    exchange: "CME",
    name: "Australian Dollar",
    type: "Currency",
    tickSize: 0.0001,
    tickValue: 10,
    pointValue: 100000,
    margin: 2200,
    contractMonths: "Mar, Jun, Sep, Dec",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "100,000 AUD",
  },
  {
    symbol: "6C",
    exchange: "CME",
    name: "Canadian Dollar",
    type: "Currency",
    tickSize: 0.00005,
    tickValue: 5,
    pointValue: 100000,
    margin: 1700,
    contractMonths: "Mar, Jun, Sep, Dec",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "100,000 CAD",
  },
  {
    symbol: "6S",
    exchange: "CME",
    name: "Swiss Franc",
    type: "Currency",
    tickSize: 0.0001,
    tickValue: 12.5,
    pointValue: 125000,
    margin: 3500,
    contractMonths: "Mar, Jun, Sep, Dec",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "125,000 CHF",
  },
  {
    symbol: "6M",
    exchange: "CME",
    name: "Mexican Peso",
    type: "Currency",
    tickSize: 0.00001,
    tickValue: 5,
    pointValue: 500000,
    margin: 2500,
    contractMonths: "Mar, Jun, Sep, Dec",
    tradingHours: "Sun-Fri 6:00pm-5:00pm ET",
    notes: "500,000 MXN",
  },
];

module.exports = { formatETradeCsv, formatWebullCsv, getFuturePointValue };
