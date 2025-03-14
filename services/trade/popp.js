const util = require("util");

function calculateTradeExecutionAverage(trades) {
  let current_position = 0;
  let total_cost = 0;
  let total_gross_profit = 0;
  let total_commission = 0;
  let total_investment = 0;

  // other
  let entry_price = null;
  let exit_price = null;
  let adjusted_cost_total = 0;
  let adjusted_proceed_total = 0;
  let total_buy_quantity = 0;
  let total_sell_quantity = 0;

  // for fifo
  let buyQueue = [];

  const results = trades.map((trade, index) => {
    const quantity = parseFloat(trade.quantity);
    const price = parseFloat(trade.price);
    const commission = parseFloat(trade.commission);
    total_commission += commission;
    total_investment += commission;

    if (trade.instruction === "buy") {
      // other calculations
      total_buy_quantity += quantity;
      if (index === 1) entry_price = price;

      current_position += quantity;
      total_cost += quantity * price;
      total_investment += quantity * price;

      trade.current_position = current_position;
      trade.commission = commission;
      trade.wa = {
        profits: "0.00",
        adjusted: -quantity * price,
      };

      // fifo
      buyQueue.push({ quantity, price, totalCost: quantity * price });
      trade.fifo = {
        profits: "0.00",
        adjusted: -quantity * price,
      };
      // other calculations
      adjusted_cost_total += quantity * price;
    } else {
      // other calculations
      total_sell_quantity += quantity;
      exit_price = price;

      // wa
      const weightedAverageCost = total_cost / current_position;
      const sellCost = Math.abs(quantity) * weightedAverageCost;
      const sellProfit = Math.abs(quantity) * (price - weightedAverageCost);

      total_gross_profit += sellProfit;

      current_position += quantity; // subtracting the sold shares from current position
      total_cost -= sellCost; // updating total cost after selling

      trade.current_position = current_position;
      trade.commission = commission;
      trade.wa = {
        profits: sellProfit,
        adjusted: Math.abs(quantity) * price,
      };

      // fifo
      let sellQuantity = Math.abs(quantity);
      let fifoSellProfit = 0;
      let adjustedSell = 0;

      while (sellQuantity > 0 && buyQueue.length > 0) {
        let buy = buyQueue[0];

        if (sellQuantity >= buy.quantity) {
          fifoSellProfit += (price - buy.price) * buy.quantity;
          adjustedSell += buy.totalCost;
          sellQuantity -= buy.quantity;
          buyQueue.shift(); // remove the used buy from the queue
        } else {
          fifoSellProfit += (price - buy.price) * sellQuantity;
          adjustedSell += sellQuantity * buy.price;
          buy.quantity -= sellQuantity;
          buy.totalCost -= sellQuantity * buy.price;
          sellQuantity = 0;
        }
      }
      const sellRevenue = Math.abs(quantity) * price;

      trade.fifo = {
        profits: fifoSellProfit,
        adjusted: sellRevenue,
      };

      // other calculations
      adjusted_proceed_total += Math.abs(quantity) * price;
    }
    return trade;
  });
  const total_net_profit = total_gross_profit - total_commission;
  const roi =
    total_investment > 0 ? (total_net_profit / total_investment) * 100 : 0;
  // return {
  //   results,
  //   total_gross_profit,
  //   total_net_profit: total_gross_profit - total_commission,
  //   roi,
  // };
  return {
    results,
    total_gross_profit,
    total_net_profit: total_gross_profit - total_commission,
    roi,
    total_commission,
    current_position: results.at(-1).current_position,
    ...(entry_price !== null && { entry_price }),
    ...(exit_price !== null && { exit_price }),
    average_entry: total_buy_quantity
      ? adjusted_cost_total / total_buy_quantity
      : 0,
    average_exit: total_sell_quantity
      ? adjusted_proceed_total / total_sell_quantity
      : 0,
    adjusted_cost_total,
    adjusted_proceed_total,
  };
}

function calculateShortTradeExecutionAverage(trades) {
  let current_position = 0;
  let total_cost = 0;
  let total_gross_profit = 0;
  let total_commission = 0;
  let total_investment = 0;

  // other
  let entry_price = null;
  let exit_price = null;
  let adjusted_cost_total = 0;
  let adjusted_proceed_total = 0;
  let total_buy_quantity = 0;
  let total_sell_quantity = 0;

  let shortQueue = []; // For FIFO calculations of short positions

  const results = trades.map((trade, index) => {
    const quantity = parseFloat(trade.quantity);
    const price = parseFloat(trade.price);
    const commission = parseFloat(trade.commission);
    total_commission += commission;

    if (trade.instruction === "sell") {
      // other calculations
      total_sell_quantity += quantity;
      if (index === 1) entry_price = price;

      // Initiating or increasing a short position
      current_position -= quantity;
      total_cost += quantity * price; // For WA, total cost is the sum of the sales
      total_investment += quantity * price; // Investment is the revenue from shorting

      trade.current_position = current_position;
      trade.commission = commission;
      trade.wa = {
        profits: "0.00", // Profit is calculated when covering the short
        adjusted: quantity * price,
      };

      // fifo
      shortQueue.push({ quantity, price, totalCost: quantity * price });
      trade.fifo = {
        profits: "0.00", // Profit is calculated when covering the short
        adjusted: quantity * price,
      };

      // other calculations
      adjusted_proceed_total += quantity * price;
    } else if (trade.instruction === "buy") {
      // other calculations
      total_buy_quantity += quantity;
      exit_price = price;

      // Covering the short position
      let coverQuantity = Math.abs(quantity);

      // wa
      const weightedAverageCost = total_cost / -current_position;
      const coverProfit = coverQuantity * (weightedAverageCost - price);

      total_gross_profit += coverProfit;
      current_position += quantity; // Reducing the short position
      total_cost -= coverQuantity * weightedAverageCost; // Reducing the total cost

      trade.current_position = current_position;
      trade.commission = commission;
      trade.wa = {
        profits: coverProfit,
        adjusted: -quantity * price,
      };

      // fifo
      let fifoCoverProfit = 0;
      let adjustedCover = 0;

      while (coverQuantity > 0 && shortQueue.length > 0) {
        let short = shortQueue[0];

        if (coverQuantity >= short.quantity) {
          fifoCoverProfit += (short.price - price) * short.quantity;
          adjustedCover += short.totalCost;
          coverQuantity -= short.quantity;
          shortQueue.shift(); // remove the used short from the queue
        } else {
          fifoCoverProfit += (short.price - price) * coverQuantity;
          adjustedCover += coverQuantity * short.price;
          short.quantity -= coverQuantity;
          short.totalCost -= coverQuantity * short.price;
          coverQuantity = 0;
        }
      }

      trade.fifo = {
        profits: fifoCoverProfit,
        // adjusted: -adjustedCover,
        adjusted: -quantity * price,
      };

      // other calculations
      adjusted_cost_total += quantity * price;
    }
    return trade;
  });

  const total_net_profit = total_gross_profit - total_commission;
  const roi =
    total_investment > 0
      ? (total_net_profit / (total_investment + total_commission)) * 100
      : 0;

  // return {
  //   results,
  //   total_gross_profit: total_gross_profit,
  //   total_net_profit: total_net_profit,
  //   roi,
  // };
  return {
    results,
    total_gross_profit: total_gross_profit,
    total_net_profit: total_net_profit,
    roi,
    total_commission,
    current_position: results.at(-1).current_position,
    ...(entry_price !== null && { entry_price }),
    ...(exit_price !== null && { exit_price }),
    average_entry: total_sell_quantity
      ? adjusted_proceed_total / total_sell_quantity
      : 0,
    average_exit: total_buy_quantity
      ? adjusted_cost_total / total_buy_quantity
      : 0,
    adjusted_cost_total,
    adjusted_proceed_total,
    total_sell_quantity,
    total_buy_quantity,
  };
}

const inputTrades = [
  {
    symbol: "QQQ",
    spread_type: "stock",
    quantity: "10.0",
    price: "100.0",
    instruction: "buy",
    commission: "1.0",
    id: "4fd54f7f",
  },
  {
    symbol: "QQQ",
    spread_type: "stock",
    quantity: "-5.0",
    price: "200.0",
    instruction: "sell",
    commission: "1.0",
    id: "229aa22f",
  },
  {
    symbol: "QQQ",
    spread_type: "stock",
    quantity: "5.0",
    price: "200.0",
    instruction: "buy",
    commission: "1.0",
    id: "229aa22f",
  },
  // {
  //   symbol: "QQQ",
  //   spread_type: "stock",
  //   quantity: "-5.0",
  //   price: "250.0",
  //   instruction: "sell",
  //   commission: "1.0",
  //   id: "87d5a1d0",
  // },
  {
    symbol: "QQQ",
    spread_type: "stock",
    quantity: "-10.0",
    price: "50.0",
    instruction: "sell",
    commission: "1.0",
    id: "82473008",
  },
];

// // console.log(calculateTradesWeightedAverage(inputTrades));
console.log(
  util.inspect(
    calculateTradeExecutionAverage(inputTrades),
    false,
    null,
    true /* enable colors */
  )
);
