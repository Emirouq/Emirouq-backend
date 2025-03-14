const { round } = require("../../utils/numberUtils");

function optionsShortCal(trades) {
  let current_position = 0;
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

  // total short bought
  let total_buying_for_avg = 0;
  let total_quantity_for_avg = 0;
  trades.forEach((item, index) => {
    const quantity = parseFloat(item.quantity);
    const price = parseFloat(item.price);
    if (item.side === "sell") {
      // other calculations
      total_sell_quantity += quantity;
      if (index === 0) entry_price = price;

      total_buying_for_avg += price * Math.abs(quantity);
      total_quantity_for_avg += Math.abs(quantity);
    } else if (item.side === "buy") {
      total_buy_quantity += quantity;
      exit_price = price;
    }
  });
  const buying_avg = total_buying_for_avg / total_quantity_for_avg;

  // for fifo
  let shortQueue = [];
  const contractMultiplier = Math.abs(
    parseFloat(trades[0].contractMultiplier || 100)
  );

  const results = trades.map((trade) => {
    const quantity = round(parseFloat(trade.quantity));
    const price = round(parseFloat(trade.price));
    const commission = round(parseFloat(trade.commission));

    total_commission = round(total_commission + commission);
    total_investment = round(total_investment + commission);

    if (trade.side === "sell") {
      current_position = current_position - quantity;
      total_investment = round(
        total_investment + Math.abs(quantity) * price * contractMultiplier
      );

      trade.current_position = current_position;
      trade.commission = commission;
      trade.wa = {
        profits: +"0.00",
        adjusted: round(quantity * price * contractMultiplier),
      };

      // fifo
      shortQueue.push({
        quantity: Math.abs(quantity),
        price: Math.abs(price),
        totalCost: round(
          Math.abs(quantity) * Math.abs(price) * contractMultiplier
        ),
      });

      // other calculations
      adjusted_proceed_total = round(
        adjusted_proceed_total + quantity * price * contractMultiplier
      );

      trade.fifo = {
        profits: +"0.00",
        adjusted: round(quantity * price * contractMultiplier),
      };
    } else {
      // wa
      // the following code takes the overall average and calculates
      // const buyCost = Math.abs(quantity) * buying_avg;
      // this check is if the option is expired and calculate profits based on close price
      const buyProfit = trade.isExercised
        ? round(
            Math.abs(adjusted_proceed_total) -
              Math.abs(quantity) *
                parseFloat(trade.closePrice) *
                contractMultiplier
          )
        : round(Math.abs(quantity) * (buying_avg - price) * contractMultiplier);
      total_gross_profit_wa = total_gross_profit_wa + buyProfit;
      current_position = current_position + quantity;
      trade.current_position = current_position;
      trade.commission = commission;
      trade.wa = {
        profits: buyProfit,
        adjusted: round(-quantity * price * contractMultiplier),
      };

      // fifo
      let buyQuantity = Math.abs(quantity);
      let fifoBuyProfit = 0;
      // let adjustedSell = 0;

      while (buyQuantity > 0 && shortQueue.length > 0) {
        let sell = shortQueue[0];

        if (trade.isExercised) {
          // const openPosition = shortQueue.reduce(
          //   (partialSum, a) => partialSum + a.quantity,
          //   0
          // );
          // if (buyQuantity === openPosition) {
          //   fifoBuyProfit += trade.isExercised
          //     ? Math.abs(adjusted_proceed_total) -
          //       Math.abs(openPosition) *
          //         parseFloat(trade.closePrice) *
          //         contractMultiplier
          //     : (sell.price - price) *
          //       Math.abs(openPosition) *
          //       contractMultiplier;
          //   // adjustedSell += sell.totalCost;
          //   buyQuantity -= openPosition;
          //   shortQueue = [];
          // } else
          if (buyQuantity >= sell.quantity) {
            // this check is if the option is expired and calculate profits based on close price
            // in fifo, we'll only have options expired workflow for the whole position, not for a lesser quantity than the whole
            fifoBuyProfit = round(
              fifoBuyProfit +
                Math.abs(sell.quantity) *
                  parseFloat(sell.price - trade.closePrice) *
                  contractMultiplier
            );
            // fifoBuyProfit += trade.isExercised
            //   ? Math.abs(adjusted_proceed_total) -
            //     Math.abs(quantity) *
            //       parseFloat(trade.closePrice) *
            //       contractMultiplier
            //   : (sell.price - price) * sell.quantity * contractMultiplier;
            // adjustedSell += sell.totalCost;
            buyQuantity = buyQuantity - sell.quantity;
            shortQueue.shift(); // remove the used sell from the queue
          } else {
            fifoBuyProfit = round(
              fifoBuyProfit +
                (sell.price - price) * buyQuantity * contractMultiplier
            );
            // adjustedSell += buyQuantity * sell.price;
            sell.quantity = round(sell.quantity - buyQuantity);
            sell.totalCost = round(sell.totalCost - buyQuantity * sell.price);
            buyQuantity = 0;
          }
        } else {
          if (buyQuantity >= sell.quantity) {
            fifoBuyProfit = round(
              fifoBuyProfit +
                (sell.price - price) * sell.quantity * contractMultiplier
            );
            // adjustedSell += sell.totalCost;
            buyQuantity = round(buyQuantity - sell.quantity);
            shortQueue.shift(); // remove the used sell from the queue
          } else {
            fifoBuyProfit = round(
              fifoBuyProfit +
                (sell.price - price) * buyQuantity * contractMultiplier
            );
            // adjustedSell += buyQuantity * sell.price;
            sell.quantity = round(sell.quantity - buyQuantity);
            sell.totalCost = round(sell.totalCost - buyQuantity * sell.price);
            buyQuantity = 0;
          }
        }
      }
      total_gross_profit_fifo = round(total_gross_profit_fifo + fifoBuyProfit);
      const sellRevenue = round(
        Math.abs(quantity) * price * contractMultiplier
      );

      // other calculations
      adjusted_cost_total += trade.isExercised
        ? round(
            Math.abs(quantity) *
              parseFloat(trade.closePrice) *
              contractMultiplier
          )
        : round(quantity * price * contractMultiplier);

      trade.fifo = {
        profits: fifoBuyProfit,
        adjusted: sellRevenue,
      };
    }
    return trade;
  });
  const total_net_profit_wa = round(total_gross_profit_wa - total_commission);
  const total_net_profit_fifo = round(
    total_gross_profit_fifo - total_commission
  );
  const roi_wa = round(
    total_investment > 0 ? (total_net_profit_wa / total_investment) * 100 : 0
  );
  const roi_fifo = round(
    total_investment > 0 ? (total_net_profit_fifo / total_investment) * 100 : 0
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
    average_exit: round(
      total_buy_quantity
        ? adjusted_cost_total / (total_buy_quantity * contractMultiplier)
        : 0
    ),
    average_entry: round(
      total_sell_quantity
        ? adjusted_proceed_total / (total_sell_quantity * contractMultiplier)
        : 0
    ),
    open_date: results[0].date,
    ...(current_position === 0 && {
      close_date: results.at(-1).date,
    }),
    side: "short",
  };
}

module.exports = optionsShortCal;
