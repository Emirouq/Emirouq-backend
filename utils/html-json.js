const cheerio = require("cheerio");
const dayjs = require("dayjs");
const _ = require("lodash");
const forexCommodities = [
  "XAU", //Gold
  "XAG", //Silver
  "XPT", //Platinum
  "XPD", //Palladium
  "XRO", //Rough Rice
  "WTI", //Crude Oil
  "BRENT", //Brent Oil
  "NG", //Natural Gas
  "CORN", //Corn
  "SOY", //Soybeans
  "WHEAT", //Wheat
  "COCOA", //Cocoa
  "COFFEE", //Coffee
  "SUGAR", //Sugar
  "COTTON", //Cotton
];

const formatSymbol = {
  gold: "XAUUSD",
  silver: "XAGUSD",
  platinum: "XPTUSD",
  palladium: "XPDUSD",
  roughrice: "XROUSD",
  crudeoil: "WTIUSD",
  brentoil: "BRENTUSD",
  naturalgas: "NGUSD",
  corn: "CORNUSD",
  soybeans: "SOYUSD",
  wheat: "WHEATUSD",
  cocoa: "COCOAUSD",
  coffee: "COFFEEUSD",
  sugar: "SUGARUSD",
  cotton: "COTTONUSD",
};
function splitMetaTrade({
  orderId,
  openTime,
  side,
  quantity,
  symbol,
  openPrice,
  closeTime,
  closePrice,
  commission,
  swap,
  status,
}) {
  const originalSymbol = symbol?.includes("USD")
    ? symbol?.replaceAll(".", "")?.toUpperCase()
    : formatSymbol[symbol?.toLowerCase()];
  const oppositeSide = side === "sell" ? "buy" : "sell";
  if (status === "closed") {
    return [
      {
        symbol: `${originalSymbol}-${orderId}`,
        underlyingSymbol: originalSymbol,
        orderId: `${orderId}${originalSymbol}${dayjs(openTime).format(
          "YYYYMMDDHHmmss"
        )}${side}`,
        assetClass: "forex",
        side,
        quantity: _.round(Math.abs(quantity), 5),
        price: _.round(Math.abs(openPrice), 5),
        date: dayjs(openTime).format("YYYY-MM-DD HH:mm:ss"),
        commission: _.round(Math.abs(commission || 0), 5),
        swap: 0,
        contractMultiplier: originalSymbol?.includes(forexCommodities)
          ? 100
          : 100000,
        currency: {
          code: "USD",
          name: "US Dollar",
        },
        profit: 0,
      },
      {
        symbol: `${originalSymbol}-${orderId}`,
        underlyingSymbol: originalSymbol,
        orderId: `${orderId}${originalSymbol}${dayjs(closeTime).format(
          "YYYYMMDDHHmmss"
        )}${oppositeSide}`,
        assetClass: "forex",
        side: oppositeSide,
        quantity: _.round(Math.abs(quantity), 5),
        price: _.round(Math.abs(closePrice), 5),
        date: dayjs(closeTime).format("YYYY-MM-DD HH:mm:ss"),
        commission: _.round(Math.abs(commission || 0), 5),
        swap: _.round(swap, 5),
        contractMultiplier: originalSymbol?.includes(forexCommodities)
          ? 100
          : 100000,
        currency: {
          code: "USD",
          name: "US Dollar",
        },
        profit: 0,
      },
    ];
  } else {
    return [
      {
        symbol: `${originalSymbol}-${orderId}`,
        underlyingSymbol: originalSymbol,
        orderId: `${orderId}${originalSymbol}${dayjs(openTime).format(
          "YYYYMMDDHHmmss"
        )}${side}`,
        assetClass: "forex",
        side,
        quantity: _.round(Math.abs(quantity), 5),
        price: _.round(Math.abs(openPrice), 5),
        date: dayjs(openTime).format("YYYY-MM-DD HH:mm:ss"),
        commission: _.round(Math.abs(commission || 0), 5),
        swap: 0,
        contractMultiplier: originalSymbol?.includes(forexCommodities)
          ? 100
          : 100000,
        currency: {
          code: "USD",
          name: "US Dollar",
        },
        profit: 0,
      },
    ];
  }
}
const headers = [
  "orderId",
  "openTime",
  "side",
  "quantity",
  "symbol",
  "openPrice",
  "s/l",
  "t/p",
  "closeTime",
  "closePrice",
  "commission",
  "taxes",
  "swap",
  "profit",
];
function extractRows($, sectionStartText, endRowText, status) {
  const rows = [];
  let allOrderIds = [];
  let isInSection = false;
  $("tr").each((_, row) => {
    const rowText = $(row).text().trim();
    // Detect section start
    if (rowText.includes(sectionStartText)) {
      isInSection = true;
      return; // Skip this row (it's the header row)
    }

    // Detect section end
    if (isInSection && endRowText && rowText.includes(endRowText)) {
      isInSection = false;
      return;
    }

    // If in section, collect row data
    if (isInSection) {
      const cells = $(row).find("td");
      if (cells?.length === headers?.length) {
        const rowData = {};
        cells?.each((index, cell) => {
          rowData[headers[index]] = $(cell).text().trim();
        });
        rows.push(rowData);
      }
    }
  });
  let records = rows?.length ? rows?.slice(1) : [];
  records = records
    ?.map((row) => {
      const res = splitMetaTrade({ ...row, status });
      const orderIds = res?.map((r) => r?.orderId);
      allOrderIds.push(...orderIds);
      return res;
    })
    ?.flat();

  return {
    allOrderIds,
    headers: rows?.length ? Object.values(rows[0]) : [],
    data: records,
  };
}

const extractTableData = (htmlString) => {
  const $ = cheerio.load(htmlString);
  const close = extractRows(
    $,
    "Closed Transactions:",
    "Open Trades:",
    "closed"
  );
  const open = extractRows($, "Open Trades:", "Working Orders:", "open");
  return {
    close,
    open,
  };
};

module.exports = { extractTableData, splitMetaTrade, forexCommodities };
