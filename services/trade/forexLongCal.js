const { getExchangeRate } = require("../../utils/get-usd-value");
const { round } = require("../../utils/numberUtils");
const convertToNumber = require("../util/convertToNumber");

async function forexLongCal(trades) {
  let current_position = 0;
  let total_gross_profit = 0;
  let total_gross_profit_wa = 0;
  let total_gross_profit_fifo = 0;
  let total_commission = 0;
  let total_investment = 0;

  // other
  let entry_price = null;
  let exit_price = null;
  let adjusted_cost_total = 0;
  let adjusted_proceed_total = 0;
  let total_buy_quantity = 0;
  let total_sell_quantity = 0;

  let total_buying_for_avg = 0;
  let total_quantity_for_avg = 0;
  trades?.forEach((item, index) => {
    const quantity = round(convertToNumber(item.quantity), 5);
    const price = round(convertToNumber(item.price), 5);
    if (item.side === "buy") {
      // other calculations
      total_buy_quantity = round(total_buy_quantity + quantity, 5);
      if (index === 0) entry_price = price;

      total_buying_for_avg = round(
        total_buying_for_avg + price * Math.abs(quantity),
        5
      );
      total_quantity_for_avg = round(
        total_quantity_for_avg + Math.abs(quantity),
        5
      );
    } else if (item.side === "sell") {
      total_sell_quantity = total_sell_quantity + quantity;
      exit_price = price;
    }
  });
  const buying_avg = round(total_buying_for_avg / total_quantity_for_avg, 5);

  // for fifo
  let buyQueue = [];
  const contractMultiplier = Math.abs(
    convertToNumber(trades?.[0]?.contractMultiplier || 100)
  );

  // for loop
  const results = [];
  for (const trade of trades) {
    // To find the exchange rate
    const isBaseUSD = trade?.underlyingSymbol?.endsWith("USD");
    const fromCurrency = trade?.underlyingSymbol?.replace("USD", "");
    const date = trade?.date;
    const exchangeRate = await getExchangeRate({
      isBaseUSD,
      date,
      fromCurrency,
    });

    const quantity = convertToNumber(trade.quantity);
    const price = convertToNumber(trade.price);
    const commission =
      convertToNumber(trade?.commission) + convertToNumber(trade?.swap);

    total_commission += commission;
    total_investment += commission;

    if (trade.side === "buy") {
      current_position += quantity;
      total_investment += quantity * price * contractMultiplier;

      trade.current_position = current_position;
      trade.commission = +commission;
      trade.wa = {
        profits: +"0.00",
        adjusted: -quantity * price * contractMultiplier,
      };

      // FIFO
      buyQueue.push({
        quantity,
        price,
        totalCost: quantity * price * contractMultiplier,
      });
      trade.fifo = {
        profits: +"0.00",
        adjusted: -quantity * price * contractMultiplier,
      };

      // Other calculations
      adjusted_cost_total += Math.abs(quantity) * price * contractMultiplier;
    } else {
      // Calculations for sell trades
      const sellProfit = trade.isExercised
        ? round(
            Math.abs(quantity) *
              convertToNumber(trade.closePrice) *
              contractMultiplier -
              Math.abs(adjusted_cost_total),
            5
          )
        : round(
            Math.abs(quantity) * (price - buying_avg) * contractMultiplier,
            5
          );

      total_gross_profit_wa =
        round(total_gross_profit_wa + sellProfit, 5) * exchangeRate;
      total_gross_profit = round(total_gross_profit + sellProfit, 5);
      current_position = round(current_position - quantity, 5);

      trade.current_position = current_position;
      trade.commission = commission;
      trade.wa = {
        profits: sellProfit * exchangeRate,
        adjusted: round(Math.abs(quantity) * price * contractMultiplier, 5),
      };

      // FIFO logic for sell trades
      let sellQuantity = Math.abs(quantity);
      let fifoSellProfit = 0;

      while (sellQuantity > 0 && buyQueue.length > 0) {
        let buy = buyQueue[0];

        if (trade.isExercised) {
          if (sellQuantity >= buy.quantity) {
            fifoSellProfit = round(
              fifoSellProfit +
                convertToNumber(trade.closePrice - buy.price) *
                  buy.quantity *
                  contractMultiplier,
              5
            );
            sellQuantity = round(sellQuantity - buy.quantity, 5);
            buyQueue.shift(); // Remove the used buy from the queue
          } else {
            fifoSellProfit = round(
              fifoSellProfit +
                (price - buy.price) * sellQuantity * contractMultiplier,
              5
            );
            buy.quantity = buy.quantity - sellQuantity;
            buy.totalCost = round(buy.totalCost - sellQuantity * buy.price, 5);
            sellQuantity = 0;
          }
        } else {
          if (sellQuantity >= buy.quantity) {
            fifoSellProfit = round(
              fifoSellProfit +
                (price - buy.price) * buy.quantity * contractMultiplier,
              5
            );
            sellQuantity = sellQuantity - buy.quantity;
            buyQueue.shift(); // Remove the used buy from the queue
          } else {
            fifoSellProfit = round(
              fifoSellProfit +
                (price - buy.price) * sellQuantity * contractMultiplier,
              5
            );
            buy.quantity = round(buy.quantity - sellQuantity, 5);
            buy.totalCost = round(buy.totalCost - sellQuantity * buy.price, 5);
            sellQuantity = 0;
          }
        }
      }

      total_gross_profit_fifo =
        round(total_gross_profit_fifo + fifoSellProfit, 5) * exchangeRate;

      const sellRevenue = round(
        Math.abs(quantity) * price * contractMultiplier,
        5
      );

      // Other calculations
      adjusted_proceed_total += trade.isExercised
        ? convertToNumber(trade.closePrice) * sellQuantity * contractMultiplier
        : Math.abs(quantity) * price * contractMultiplier;

      trade.fifo = {
        profits: fifoSellProfit * exchangeRate,
        adjusted: sellRevenue,
      };
    }
    results.push(trade);
  }
  const total_net_profit_wa = total_gross_profit_wa - total_commission;
  const total_net_profit_fifo = total_gross_profit_fifo - total_commission;
  const roi_wa =
    adjusted_cost_total > 0
      ? (total_net_profit_wa / adjusted_cost_total) * 100
      : 0;
  const roi_fifo =
    adjusted_cost_total > 0
      ? (total_net_profit_fifo / adjusted_cost_total) * 100
      : 0;

  return {
    executions: results,
    total_quantity: total_buy_quantity,
    total_gross_profit_wa,
    total_gross_profit_fifo,
    total_net_profit_wa,
    total_net_profit_fifo,
    roi_wa,
    roi_fifo,
    total_commission,
    current_position: round(results.at(-1).current_position, 5),
    ...(entry_price !== null && { entry_price }),
    ...(exit_price !== null && { exit_price }),
    adjusted_cost_total,
    adjusted_proceed_total,
    average_entry: round(
      total_buy_quantity
        ? adjusted_cost_total / (total_buy_quantity * contractMultiplier)
        : 0,
      5
    ),
    average_exit: round(
      total_sell_quantity
        ? adjusted_proceed_total / (total_sell_quantity * contractMultiplier)
        : 0,
      5
    ),
    open_date: results[0].date,
    ...(current_position === 0 && {
      close_date: results.at(-1).date,
    }),
    side: "long",
  };
}

module.exports = forexLongCal;
