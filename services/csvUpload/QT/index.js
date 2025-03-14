const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);
const Trade = require("../../../models/Trade.model");
const convertToNumber = require("../../util/convertToNumber");

function groupBySymbolId(data) {
  const groupedData = {};

  data.forEach((item) => {
    const securityID = item["Symbol"];

    if (!groupedData[securityID]) {
      groupedData[securityID] = [];
    }

    groupedData[securityID].push(item);
  });

  return groupedData;
}
function calculateTradesForAccount(trades) {
  const resultingTrades = [];
  let currentTradeSet = [];
  let netPosition = 0;

  let i = 0;
  const updatedTrades = trades
    .map((trade) => {
      return {
        ...trade,
        side:
          trade.Action === "SHRT" ||
          trade.Action === "Sell" ||
          trade.side === "sell" ||
          trade.Action === "STC" ||
          trade.Action === "STO"
            ? "sell"
            : "buy",
        quantity: trade?.uuid
          ? +trade.quantity
          : Math.abs(+convertToNumber(trade.Qty)),
        date: trade?.date
          ? dayjs(trade?.date)
              .tz("America/New_York")
              .format("YYYY-MM-DD HH:mm:ss")
          : trade?.["Updated Time"],
      };
    })
    ?.sort((a, b) => new Date(a.date) - new Date(b.date));

  do {
    const trade = updatedTrades[i];
    let tradeNetPosition = netPosition;
    const quantity =
      trade.side === "sell"
        ? -parseInt(trade.quantity)
        : parseInt(trade.quantity);
    tradeNetPosition += quantity;
    trade.side = trade.side === "sell" ? "sell" : "buy";
    trade.price = !trade?.uuid
      ? convertToNumber(trade["Fill price"])
      : +trade.price;
    trade.commission = !trade?.uuid
      ? Math.abs(convertToNumber(trade["Total fees"]))
      : trade.commission;
    trade.orderId = !trade?.uuid
      ? convertToNumber(trade["Order ID"])
      : trade.orderId;
    // trade.date = !trade?.uuid ? trade?.["Updated time"] : trade.date;
    trade.quantity = Math.abs(convertToNumber(quantity));
    // Append trade to current trade set
    currentTradeSet.push({
      ...trade,
      netPosition: tradeNetPosition,
    });

    // If net position becomes zero or it's the last trade, push the current trade set to resulting trades and reset current trade set
    if (tradeNetPosition === 0 || i === updatedTrades.length - 1) {
      resultingTrades.push([...currentTradeSet]);
      currentTradeSet = [];
    }

    // Update net position for next iteration
    netPosition = tradeNetPosition;

    i++;
  } while (i < updatedTrades.length);

  return resultingTrades;
}

async function formatQTResponse({ data, accountId, brokerName, importVia }) {
  const processedTrades = {};

  for (const symbol in data) {
    const tradeExecutions = await Trade.aggregate([
      {
        $match: {
          symbol: symbol?.trim()?.toUpperCase(),
          status: "open",
          accountId,
          brokerName,
          importVia,
        },
      },
      {
        $lookup: {
          from: "executions",
          localField: "uuid",
          foreignField: "tradeId",
          as: "executions",
        },
      },
    ]);

    processedTrades[symbol] = {
      tradeId: tradeExecutions?.[0]?.uuid,
      trades: calculateTradesForAccount([
        ...data?.[symbol],
        ...(tradeExecutions?.[0]?.executions || []),
      ]),
    };
  }
  return processedTrades;
}

module.exports = {
  groupBySymbolId,
  formatQTResponse,
};
