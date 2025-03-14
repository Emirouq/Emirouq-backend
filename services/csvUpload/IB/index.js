const Trade = require("../../../models/Trade.model");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const convertToNumber = require("../../util/convertToNumber");
dayjs.extend(utc);
dayjs.extend(timezone);

function calculateTradesForAccount(trades) {
  const resultingTrades = [];
  let currentTradeSet = [];

  let netPosition = 0;

  const updatedTrades = trades
    .map((trade) => {
      return {
        ...trade,
        side: trade?.side || trade?.["Buy/Sell"]?.toLowerCase(),
        quantity: trade?.uuid
          ? +trade?.quantity
          : Math.abs(+convertToNumber(trade?.Quantity)),
        date: trade?.uuid
          ? dayjs(trade?.date)
              .tz("America/New_York")
              .format("YYYY-MM-DD HH:mm:ss")
          : trade.DateTime,
        orderId: trade?.uuid
          ? trade?.orderId?.toString()
          : convertToNumber(trade?.TradeID)?.toString(),
      };
    })
    ?.sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });

  for (let i = 0; i < updatedTrades.length; i++) {
    const trade = updatedTrades[i];
    const quantity = Math.abs(+convertToNumber(trade.quantity));
    const tradeNetPosition =
      trade.side === "sell" ? netPosition - quantity : netPosition + quantity;

    currentTradeSet.push({
      ...trade,
      side: trade.side,
      orderId: trade.orderId,
      NetPosition: tradeNetPosition,
      quantity,
    });

    if (tradeNetPosition === 0 || i === trades.length - 1) {
      resultingTrades.push([...currentTradeSet]);
      currentTradeSet = [];
    }

    netPosition = tradeNetPosition;
  }

  return resultingTrades;
}

async function formatIBResponse({ data, broker, accountId, importVia }) {
  const processedTrades = {};

  for (const symbol in data) {
    const tradeExecutions = await Trade.aggregate([
      {
        $match: {
          symbol: symbol?.trim()?.toUpperCase(),
          status: "open",
          accountId,
          brokerName: broker,
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
        ...data[symbol],
        ...(tradeExecutions?.[0]?.executions || []),
      ]),
    };
  }
  return processedTrades;
}

module.exports = {
  formatIBResponse,
};
