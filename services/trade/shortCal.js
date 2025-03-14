// const util = require("util");

const { round } = require("../../utils/numberUtils");

function shortCal(trades) {
  let current_position = 0;
  let total_cost = 0;
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

  // total short bought
  let total_buying_for_avg = 0;
  let total_quantity_for_avg = 0;
  trades.forEach((item, index) => {
    const quantity = round(parseFloat(item.quantity));
    const price = round(parseFloat(item.price));
    if (item.side === "sell") {
      // other calculations
      total_sell_quantity += quantity;
      if (index === 0) entry_price = price;

      total_buying_for_avg = round(
        total_buying_for_avg + price * Math.abs(quantity)
      );
      total_quantity_for_avg += Math.abs(quantity);
    } else if (item.side === "buy") {
      total_buy_quantity = round(total_buy_quantity + quantity);
      exit_price = price;
    }
  });
  const buying_avg = round(total_buying_for_avg / total_quantity_for_avg);

  // for fifo
  let shortQueue = [];

  const results = trades.map((trade) => {
    const quantity = round(parseFloat(trade.quantity));
    const price = round(parseFloat(trade.price));
    const commission = round(parseFloat(trade.commission));
    total_commission = round(total_commission + commission);

    if (trade.side === "sell") {
      current_position = round(current_position - quantity);
      total_cost = round(total_cost + Math.abs(quantity) * price);

      trade.current_position = round(current_position);
      trade.commission = round(commission);
      trade.wa = {
        profits: +"0.00",
        adjusted: round(quantity * price),
      };

      // fifo
      shortQueue.push({
        quantity: Math.abs(quantity),
        price: Math.abs(price),
        totalCost: round(Math.abs(quantity) * Math.abs(price)),
      });

      // other calculations
      adjusted_proceed_total = round(adjusted_proceed_total + quantity * price);

      trade.fifo = {
        profits: +"0.00",
        adjusted: round(quantity * price),
      };
    } else {
      // wa
      // the following code takes the overall average and calculates
      const buyCost = round(Math.abs(quantity) * buying_avg);
      const buyProfit = round(Math.abs(quantity) * (buying_avg - price));
      total_gross_profit_wa = round(total_gross_profit_wa + buyProfit);
      current_position = round(current_position + quantity);
      total_cost = round(total_cost - buyCost);
      trade.current_position = round(current_position);
      trade.commission = round(commission);
      trade.wa = {
        profits: buyProfit,
        adjusted: round(-quantity * price),
      };

      // fifo
      let buyQuantity = Math.abs(quantity);
      let fifoBuyProfit = 0;
      let adjustedSell = 0;

      while (buyQuantity > 0 && shortQueue.length > 0) {
        let sell = shortQueue[0];

        if (buyQuantity >= sell.quantity) {
          fifoBuyProfit += (sell.price - price) * sell.quantity;
          adjustedSell += sell.totalCost;
          buyQuantity -= sell.quantity;
          shortQueue.shift(); // remove the used sell from the queue
        } else {
          fifoBuyProfit += (sell.price - price) * buyQuantity;
          adjustedSell += buyQuantity * sell.price;
          sell.quantity -= buyQuantity;
          sell.totalCost -= buyQuantity * sell.price;
          buyQuantity = 0;
        }
      }
      total_gross_profit_fifo = round(total_gross_profit_fifo + fifoBuyProfit);
      const sellRevenue = Math.abs(quantity) * price;

      // other calculations
      adjusted_cost_total = round(adjusted_cost_total + quantity * price);

      trade.fifo = {
        profits: round(fifoBuyProfit),
        adjusted: round(sellRevenue),
      };
    }
    return trade;
  });
  const total_net_profit_wa = round(total_gross_profit_wa - total_commission);
  const total_net_profit_fifo = round(
    total_gross_profit_fifo - total_commission
  );
  const roi_wa = round(
    adjusted_proceed_total > 0
      ? (total_net_profit_wa / adjusted_proceed_total) * 100
      : 0
  );
  const roi_fifo = round(
    adjusted_proceed_total > 0
      ? (total_net_profit_fifo / adjusted_proceed_total) * 100
      : 0
  );
  return {
    executions: results,
    total_quantity: total_sell_quantity,
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
    average_exit: total_buy_quantity
      ? adjusted_cost_total / total_buy_quantity
      : 0,
    average_entry: total_sell_quantity
      ? adjusted_proceed_total / total_sell_quantity
      : 0,
    open_date: results[0].date,
    ...(current_position === 0 && {
      close_date: results.at(-1).date,
    }),
    side: "short",
  };
}

module.exports = shortCal;

// // Example of short trades
// const shortTrades = [
//   {
//     symbol: "QQQ",
//     spread_type: "stock",
//     quantity: "10.0",
//     price: "100.0",
//     side: "sell",
//     commission: "1.0",
//     id: "4fd54f7f",
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
//     side: "sell",
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
// ];

// // console.log(calculateShortTradeExecutionAverage(shortTrades));
// console.log(
//   util.inspect(
//     calculateShortTradeExecutionAverage(shortTrades),
//     false,
//     null,
//     true /* enable colors */
//   )
// );
