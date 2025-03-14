const { round } = require("../../utils/numberUtils");

function optionsLongCal(trades) {
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
  trades.forEach((item, index) => {
    const quantity = round(parseFloat(item.quantity));
    const price = round(parseFloat(item.price));
    if (item.side === "buy") {
      // other calculations
      total_buy_quantity = round(total_buy_quantity + quantity);
      if (index === 0) entry_price = price;

      total_buying_for_avg = round(
        total_buying_for_avg + price * Math.abs(quantity)
      );
      total_quantity_for_avg = round(
        total_quantity_for_avg + Math.abs(quantity)
      );
    } else if (item.side === "sell") {
      total_sell_quantity = total_sell_quantity + quantity;
      exit_price = price;
    }
  });
  const buying_avg = round(total_buying_for_avg / total_quantity_for_avg);

  // for fifo
  let buyQueue = [];
  const contractMultiplier = Math.abs(
    parseFloat(trades[0]?.contractMultiplier || 100)
  );

  const results = trades.map((trade) => {
    const quantity = parseFloat(trade.quantity);
    const price = parseFloat(trade.price);
    const commission = parseFloat(trade.commission);

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

      // fifo
      buyQueue.push({
        quantity,
        price,
        totalCost: quantity * price * contractMultiplier,
      });
      trade.fifo = {
        profits: +"0.00",
        adjusted: -quantity * price * contractMultiplier,
      };
      // other calculations
      adjusted_cost_total += Math.abs(quantity) * price * contractMultiplier;
    } else {
      // the following code takes the overall average and calculates
      // this check is if the option is expired and calculate profits based on close price
      const sellProfit = trade.isExercised
        ? round(
            Math.abs(quantity) *
              parseFloat(trade.closePrice) *
              contractMultiplier -
              Math.abs(adjusted_cost_total)
          )
        : round(Math.abs(quantity) * (price - buying_avg) * contractMultiplier);
      total_gross_profit_wa = round(total_gross_profit_wa + sellProfit);
      total_gross_profit = round(total_gross_profit + sellProfit);
      current_position = round(current_position - quantity);
      trade.current_position = current_position;
      trade.commission = commission;
      trade.wa = {
        profits: sellProfit,
        adjusted: round(Math.abs(quantity) * price * contractMultiplier),
      };

      // fifo
      let sellQuantity = Math.abs(quantity);
      let fifoSellProfit = 0;
      // let adjustedSell = 0;

      while (sellQuantity > 0 && buyQueue.length > 0) {
        let buy = buyQueue[0];
        // check if trade is exercised
        if (trade.isExercised) {
          // const openPosition = buyQueue.reduce(
          //   (partialSum, a) => partialSum + a.quantity,
          //   0
          // );
          // if (sellQuantity === openPosition) {
          //   fifoSellProfit += trade.isExercised
          //     ? parseFloat(trade.closePrice) *
          //         openPosition *
          //         contractMultiplier -
          //       Math.abs(adjusted_cost_total)
          //     : (price - buy.price) * openPosition * contractMultiplier;
          //   // adjustedSell += buy.totalCost;
          //   sellQuantity -= openPosition;
          //   buyQueue = [];
          // } else
          if (sellQuantity >= buy.quantity) {
            // in fifo, we'll only have options expired workflow for the whole position
            fifoSellProfit = round(
              fifoSellProfit +
                parseFloat(trade.closePrice - buy.price) *
                  buy.quantity *
                  contractMultiplier
            );
            // fifoSellProfit += trade.isExercised
            //   ? parseFloat(trade.closePrice) *
            //       sellQuantity *
            //       contractMultiplier -
            //     Math.abs(adjusted_cost_total)
            //   : (price - buy.price) * buy.quantity * contractMultiplier;
            // adjustedSell += buy.totalCost;
            sellQuantity = round(sellQuantity - buy.quantity);
            buyQueue.shift(); // remove the used buy from the queue
          } else {
            fifoSellProfit = round(
              fifoSellProfit +
                (price - buy.price) * sellQuantity * contractMultiplier
            );
            // adjustedSell += sellQuantity * buy.price * contractMultiplier;
            buy.quantity = buy.quantity - sellQuantity;
            buy.totalCost = round(buy.totalCost - sellQuantity * buy.price);
            sellQuantity = 0;
          }
        } else {
          // this is for when trade is not exercised
          if (sellQuantity >= buy.quantity) {
            fifoSellProfit = round(
              fifoSellProfit +
                (price - buy.price) * buy.quantity * contractMultiplier
            );
            // adjustedSell += buy.totalCost;
            sellQuantity = sellQuantity - buy.quantity;
            buyQueue.shift(); // remove the used buy from the queue
          } else {
            fifoSellProfit = round(
              fifoSellProfit +
                (price - buy.price) * sellQuantity * contractMultiplier
            );
            // adjustedSell += sellQuantity * buy.price * contractMultiplier;
            buy.quantity = round(buy.quantity - sellQuantity);
            buy.totalCost = round(buy.totalCost - sellQuantity * buy.price);
            sellQuantity = 0;
          }
        }
      }
      total_gross_profit_fifo = round(total_gross_profit_fifo + fifoSellProfit);
      const sellRevenue = round(
        Math.abs(quantity) * price * contractMultiplier
      );

      // other calculations
      adjusted_proceed_total += trade.isExercised
        ? parseFloat(trade.closePrice) * sellQuantity * contractMultiplier
        : Math.abs(quantity) * price * contractMultiplier;

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
    average_entry: round(
      total_buy_quantity
        ? adjusted_cost_total / (total_buy_quantity * contractMultiplier)
        : 0
    ),
    average_exit: round(
      total_sell_quantity
        ? adjusted_proceed_total / (total_sell_quantity * contractMultiplier)
        : 0
    ),
    open_date: results[0].date,
    ...(current_position === 0 && {
      close_date: results.at(-1).date,
    }),
    side: "long",
  };
}

module.exports = optionsLongCal;
