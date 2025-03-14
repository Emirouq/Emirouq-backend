const { getExchangeRate } = require("../../utils/get-usd-value");
const { round } = require("../../utils/numberUtils");
const convertToNumber = require("../util/convertToNumber");

async function forexShortCal(trades) {
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
    const quantity = convertToNumber(item.quantity);
    const price = convertToNumber(item.price);
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
    convertToNumber(trades[0].contractMultiplier || 100)
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
    const quantity = round(convertToNumber(trade.quantity), 5);
    const price = round(convertToNumber(trade.price), 5);
    const commission = round(
      convertToNumber(trade?.commission) + convertToNumber(trade?.swap),
      5
    );

    total_commission = round(total_commission + commission, 5);
    total_investment = round(total_investment + commission, 5);

    if (trade.side === "sell") {
      current_position -= quantity;
      total_investment = round(
        total_investment + Math.abs(quantity) * price * contractMultiplier,
        5
      );

      trade.current_position = current_position;
      trade.commission = commission;
      trade.wa = {
        profits: +"0.00",
        adjusted: round(quantity * price * contractMultiplier, 5),
      };

      // FIFO
      shortQueue.push({
        quantity: Math.abs(quantity),
        price: Math.abs(price),
        totalCost: round(
          Math.abs(quantity) * Math.abs(price) * contractMultiplier,
          5
        ),
      });

      // Other calculations
      adjusted_proceed_total = round(
        adjusted_proceed_total + quantity * price * contractMultiplier,
        5
      );

      trade.fifo = {
        profits: +"0.00",
        adjusted: round(quantity * price * contractMultiplier, 5),
      };
    } else {
      // WA
      const buyProfit = trade.isExercised
        ? round(
            Math.abs(adjusted_proceed_total) -
              Math.abs(quantity) *
                convertToNumber(trade.closePrice) *
                contractMultiplier,
            5
          )
        : round(
            Math.abs(quantity) * (buying_avg - price) * contractMultiplier,
            5
          );

      total_gross_profit_wa += buyProfit * exchangeRate;
      current_position += quantity;
      trade.current_position = current_position;
      trade.commission = commission;
      trade.wa = {
        profits: buyProfit * exchangeRate,
        adjusted: round(-quantity * price * contractMultiplier, 5),
      };

      // FIFO
      let buyQuantity = Math.abs(quantity);
      let fifoBuyProfit = 0;

      while (buyQuantity > 0 && shortQueue.length > 0) {
        let sell = shortQueue[0];

        if (trade.isExercised) {
          if (buyQuantity >= sell.quantity) {
            fifoBuyProfit = round(
              fifoBuyProfit +
                Math.abs(sell.quantity) *
                  convertToNumber(sell.price - trade.closePrice) *
                  contractMultiplier,
              5
            );
            buyQuantity -= sell.quantity;
            shortQueue.shift();
          } else {
            fifoBuyProfit = round(
              fifoBuyProfit +
                (sell.price - price) * buyQuantity * contractMultiplier,
              5
            );
            sell.quantity = round(sell.quantity - buyQuantity, 5);
            sell.totalCost = round(
              sell.totalCost - buyQuantity * sell.price,
              5
            );
            buyQuantity = 0;
          }
        } else {
          if (buyQuantity >= sell.quantity) {
            fifoBuyProfit = round(
              fifoBuyProfit +
                (sell.price - price) * sell.quantity * contractMultiplier,
              5
            );
            buyQuantity = round(buyQuantity - sell.quantity, 5);
            shortQueue.shift();
          } else {
            fifoBuyProfit = round(
              fifoBuyProfit +
                (sell.price - price) * buyQuantity * contractMultiplier,
              5
            );
            sell.quantity = round(sell.quantity - buyQuantity, 5);
            sell.totalCost = round(
              sell.totalCost - buyQuantity * sell.price,
              5
            );
            buyQuantity = 0;
          }
        }
      }

      total_gross_profit_fifo = round(
        total_gross_profit_fifo + fifoBuyProfit * exchangeRate,
        5
      );

      const sellRevenue = round(
        Math.abs(quantity) * price * contractMultiplier,
        5
      );

      // Other calculations
      adjusted_cost_total += trade.isExercised
        ? round(
            Math.abs(quantity) *
              convertToNumber(trade.closePrice) *
              contractMultiplier,
            5
          )
        : round(quantity * price * contractMultiplier, 5);

      trade.fifo = {
        profits: fifoBuyProfit * exchangeRate,
        adjusted: sellRevenue,
      };
    }

    results.push(trade);
  }
  const total_net_profit_wa = round(
    total_gross_profit_wa - total_commission,
    5
  );
  const total_net_profit_fifo = round(
    total_gross_profit_fifo - total_commission,
    5
  );
  const roi_wa = round(
    total_investment > 0 ? (total_net_profit_wa / total_investment) * 100 : 0,
    5
  );
  const roi_fifo = round(
    total_investment > 0 ? (total_net_profit_fifo / total_investment) * 100 : 0,
    5
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
    current_position: round(results.at(-1).current_position, 5),
    ...(entry_price !== null && { entry_price }),
    ...(exit_price !== null && { exit_price }),
    adjusted_cost_total,
    adjusted_proceed_total,
    average_exit: round(
      total_buy_quantity
        ? adjusted_cost_total / (total_buy_quantity * contractMultiplier)
        : 0,
      5
    ),
    average_entry: round(
      total_sell_quantity
        ? adjusted_proceed_total / (total_sell_quantity * contractMultiplier)
        : 0,
      5
    ),
    open_date: results[0].date,
    ...(current_position === 0 && {
      close_date: results.at(-1).date,
    }),
    side: "short",
  };
}

module.exports = forexShortCal;
