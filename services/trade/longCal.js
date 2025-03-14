const { round } = require("../../utils/numberUtils");

function longCal(trades) {
  let current_position = 0;
  let total_cost = 0;
  let total_gross_profit = 0;
  let total_gross_profit_wa = 0;
  let total_gross_profit_fifo = 0;
  let total_commission = 0;

  // other
  let entry_price = null;
  let exit_price = null;
  let adjusted_cost_total = 0;
  let adjusted_proceed_total = 0;
  let total_buy_quantity = 0;
  let total_sell_quantity = 0;

  let total_buying_for_avg = 0;
  let total_quantity_for_avg = 0;
  trades.forEach((item, index) => {
    const quantity = parseFloat(item.quantity);
    const price = parseFloat(item.price);
    if (item.side === "buy") {
      // other calculations
      total_buy_quantity += quantity;
      if (index === 0) entry_price = price;

      total_buying_for_avg += price * Math.abs(quantity);
      total_quantity_for_avg += Math.abs(quantity);
    } else if (item.side === "sell") {
      // other calculations
      total_sell_quantity += quantity;
      exit_price = price;
    }
  });
  const buying_avg = total_buying_for_avg / total_quantity_for_avg;

  // for fifo
  let buyQueue = [];

  const results = trades.map((trade) => {
    const quantity = round(parseFloat(trade.quantity));
    const price = round(parseFloat(trade.price));
    const commission = round(parseFloat(trade.commission));
    total_commission = round(total_commission + commission);
    if (trade.side === "buy") {
      current_position = round(current_position + quantity);
      total_cost = round(total_cost + quantity * price);

      trade.current_position = current_position;
      trade.commission = +commission;
      trade.wa = {
        profits: +"0.00",
        adjusted: round(-quantity * price),
      };

      // fifo
      buyQueue.push({ quantity, price, totalCost: round(quantity * price) });
      trade.fifo = {
        profits: +"0.00",
        adjusted: round(-quantity * price),
      };
      // other calculations
      adjusted_cost_total = round(
        adjusted_cost_total + Math.abs(quantity) * price
      );
    } else {
      // wa
      // the following code takes moving average in the order of execution
      // const weightedAverageCost = total_cost / current_position;
      // const sellCost = Math.abs(quantity) * weightedAverageCost;
      // const sellProfit = Math.abs(quantity) * (price - weightedAverageCost);

      // total_gross_profit += sellProfit;

      // current_position += quantity; // subtracting the sold shares from current position
      // total_cost -= sellCost; // updating total cost after selling

      // trade.current_position = current_position;
      // trade.commission = commission;
      // trade.wa = {
      //   profits: sellProfit,
      //   adjusted: Math.abs(quantity) * price,
      // };

      // the following code takes the overall average and calculates
      const sellCost = round(Math.abs(quantity) * buying_avg);
      const sellProfit = round(Math.abs(quantity) * (price - buying_avg));
      total_gross_profit_wa = round(total_gross_profit_wa + sellProfit);
      total_gross_profit = round(total_gross_profit + sellProfit);
      current_position = round(current_position - quantity);
      total_cost = round(total_cost - sellCost);
      trade.current_position = current_position;
      trade.commission = commission;
      trade.wa = {
        profits: sellProfit,
        adjusted: round(Math.abs(quantity) * price),
      };

      // fifo
      let sellQuantity = round(Math.abs(quantity));
      let fifoSellProfit = 0;
      let adjustedSell = 0;

      while (sellQuantity > 0 && buyQueue.length > 0) {
        let buy = buyQueue[0];

        if (sellQuantity >= buy.quantity) {
          fifoSellProfit = round(
            fifoSellProfit + (price - buy.price) * buy.quantity
          );
          adjustedSell = round(adjustedSell + buy.totalCost);
          sellQuantity = round(sellQuantity - buy.quantity);
          buyQueue.shift(); // remove the used buy from the queue
        } else {
          fifoSellProfit = round(
            fifoSellProfit + (price - buy.price) * sellQuantity
          );
          adjustedSell = round(adjustedSell + sellQuantity * buy.price);
          buy.quantity -= sellQuantity;
          buy.totalCost -= sellQuantity * buy.price;
          sellQuantity = 0;
        }
      }
      total_gross_profit_fifo += fifoSellProfit;
      const sellRevenue = Math.abs(quantity) * price;

      // other calculations
      adjusted_proceed_total += Math.abs(quantity) * price;

      trade.fifo = {
        profits: fifoSellProfit,
        adjusted: sellRevenue,
      };
    }
    return trade;
  });
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
    current_position: round(results.at(-1).current_position),
    ...(entry_price !== null && { entry_price }),
    ...(exit_price !== null && { exit_price }),
    adjusted_cost_total,
    adjusted_proceed_total,
    average_entry: total_buy_quantity
      ? adjusted_cost_total / total_buy_quantity
      : 0,
    average_exit: total_sell_quantity
      ? adjusted_proceed_total / total_sell_quantity
      : 0,
    open_date: results[0].date,
    ...(current_position === 0 && {
      close_date: results.at(-1).date,
    }),
    side: "long",
  };
}

module.exports = longCal;

// // Example of short trades
// const shortTrades = [
//   {
//     symbol: "QQQ",
//     spread_type: "stock",
//     quantity: "10.0",
//     price: "100.0",
//     side: "buy",
//     commission: "1.0",
//     id: "4fd54f7f",
//   },
//   {
//     symbol: "QQQ",
//     spread_type: "stock",
//     quantity: "5.0",
//     price: "200.0",
//     side: "buy",
//     commission: "1.0",
//     id: "229aa22f",
//   },
//   {
//     symbol: "QQQ",
//     spread_type: "stock",
//     quantity: "5.0",
//     price: "200.0",
//     side: "sell",
//     commission: "1.0",
//     id: "229aa22f",
//   },
//   {
//     symbol: "QQQ",
//     spread_type: "stock",
//     quantity: "5.0",
//     price: "200.0",
//     side: "buy",
//     commission: "1.0",
//     id: "229aa22f",
//   },
//   {
//     symbol: "QQQ",
//     spread_type: "stock",
//     quantity: "5.0",
//     price: "200.0",
//     side: "buy",
//     commission: "1.0",
//     id: "229aa22f",
//   },
//   {
//     symbol: "QQQ",
//     spread_type: "stock",
//     quantity: "5.0",
//     price: "200.0",
//     side: "sell",
//     commission: "1.0",
//     id: "229aa22f",
//   },
// ];

// // console.log(calculateShortTradeExecutionAverage(shortTrades));
// console.log(
//   util.inspect(
//     calculateTradeExecutionAverage(shortTrades),
//     false,
//     null,
//     true /* enable colors */
//   )
// );
