const Executions = require("../../models/Execution.model");
const Trades = require("../../models/Trade.model");
const longCal = require("../trade/longCal");
const shortCal = require("../trade/shortCal");
const forexLongCal = require("../trade/forexLongCal");
const forexShortCal = require("../trade/forexShortCal");
const optionsLongCal = require("../trade/optionsLongCal");
const optionsShortCal = require("../trade/optionsShortCal");
const dayjs = require("dayjs");
const timezone = require("dayjs/plugin/timezone");
const convertToNumber = require("../util/convertToNumber");
const { save } = require("./save");
const { batchProcess, saveForex } = require("./saveForex");
const { convertCurrencyToUSD } = require("../../utils/get-usd-value");
const { round } = require("../../utils/numberUtils");

dayjs.extend(timezone);
// fromSNap  useCase,
// since we are fetching majority of the data from Snaptrade
// from snaptrade we are getting date in UTC format
// so, if from snap, then date will be saved as it is in UTC
// if not from snap, then date will be converted to UTC
// since in case of MT5, we are getting date in UTC format and we are not getting it  fronm snaptrade
// still we will use fromsnap as true in case of MT5 also

const saveTrades = async ({
  brokerName,
  userId,
  importVia,
  timeZone = "America/New_York",
  allOrderIds,
  account,
  trades,
  fromSnap = false,
  isOrderIdString = false,
}) => {
  let existingExecutions = await Executions.find(
    {
      accountId: account?.uuid,
      brokerName,
      importVia,
      orderId: {
        $in: allOrderIds,
      },
    },
    {
      orderId: 1,
    }
  );
  existingExecutions = existingExecutions.map((i) => i.orderId);
  const filteredResults = trades
    ?.filter((i) => !existingExecutions.includes(i.orderId))
    ?.filter((i) =>
      ["stocks", "option", "forex", "future", "crypto"].includes(i.assetClass)
    )
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let allOptions = [];
  let allStocks = [];
  let allForex = [];
  let allFutures = [];
  let allCrypto = [];

  filteredResults?.forEach((order) => {
    const symbol = order?.symbol;
    if (order?.assetClass === "option") {
      allOptions.push(symbol);
    } else if (order?.assetClass === "stocks") {
      allStocks.push(symbol);
    } else if (order?.assetClass === "forex") {
      allForex.push(symbol);
    } else if (order?.assetClass === "future") {
      allFutures.push(symbol);
    } else if (order?.assetClass === "crypto") {
      allCrypto.push(symbol);
    }
  });

  const [
    allOptionsOpen,
    allStocksOpen,
    allForexOpen,
    allFutureOpen,
    allCryptoOpen,
  ] = await Promise.all([
    // Fetch open option trades
    Trades.aggregate([
      {
        $match: {
          symbol: {
            $in: allOptions,
          },
          tradeType: "option",
          status: "open",
          importVia,
          accountId: account?.uuid,
        },
      },
      {
        $lookup: {
          from: "executions",
          localField: "executions",
          foreignField: "uuid",
          as: "executions",
        },
      },
    ]),
    // Fetch open stock trades
    Trades.aggregate([
      {
        $match: {
          symbol: {
            $in: allStocks,
          },
          tradeType: "stocks",
          status: "open",
          importVia,
          accountId: account?.uuid,
        },
      },
      {
        $lookup: {
          from: "executions",
          localField: "executions",
          foreignField: "uuid",
          as: "executions",
        },
      },
    ]),
    // Fetch open forex trades
    Trades.aggregate([
      {
        $match: {
          symbol: { $in: allForex },
          tradeType: "forex",
          status: "open",
          importVia,
          accountId: account?.uuid,
        },
      },
      {
        $lookup: {
          from: "executions",
          localField: "executions",
          foreignField: "uuid",
          as: "executions",
        },
      },
    ]),
    // Fetch open future trades
    Trades.aggregate([
      {
        $match: {
          symbol: { $in: allFutures },
          tradeType: "future",
          status: "open",
          importVia,
          accountId: account?.uuid,
        },
      },
      {
        $lookup: {
          from: "executions",
          localField: "executions",
          foreignField: "uuid",
          as: "executions",
        },
      },
    ]),
    // Fetch open crypto trades
    Trades.aggregate([
      {
        $match: {
          symbol: { $in: allCrypto },
          tradeType: "crypto",
          status: "open",
          importVia,
          accountId: account?.uuid,
        },
      },
      {
        $lookup: {
          from: "executions",
          localField: "executions",
          foreignField: "uuid",
          as: "executions",
        },
      },
    ]),
  ]);

  const stocks = {};
  const options = {};
  const forex = {};
  const future = {};
  const crypto = {};

  // add open positions first coming from database

  for (let trade of allStocksOpen) {
    stocks[trade.symbol] = {
      trades: [
        await Promise.all(
          trade.executions?.map(async (i) => {
            let conversionRate = 1;
            let price = i?.price;
            let commission = i?.commission || 0;
            if (
              i?.currency?.code &&
              i?.currency?.code?.toLowerCase() !== "usd" &&
              importVia === "brokerSync"
            ) {
              if (i?.currency?.conversionRate) {
                conversionRate = i?.currency?.conversionRate;
              } else {
                conversionRate = await convertCurrencyToUSD(
                  i?.date,
                  i?.currency?.code
                );
              }
              price = round(price / conversionRate);
              commission = round(commission / conversionRate);
            }
            return {
              ...i,
              ...(i?.currency?.name?.toLowerCase() !== "usd" && {
                price,
                commission,
                currency: {
                  ...i.currency,
                  conversionRate,
                },
              }),
            };
          })
        ),
      ],
      position: round(trade.currentPosition),
    };
  }
  for (let trade of allOptionsOpen) {
    options[trade.symbol] = {
      trades: [
        await Promise.all(
          trade.executions?.map(async (i) => {
            let price = i?.price;
            let commission = i?.commission || 0;
            let conversionRate = 1;
            if (
              i?.currency?.code &&
              i?.currency?.code?.toLowerCase() !== "usd" &&
              importVia === "brokerSync"
            ) {
              if (i?.currency?.conversionRate) {
                conversionRate = i?.currency?.conversionRate;
              } else {
                conversionRate = await convertCurrencyToUSD(
                  i?.date,
                  i?.currency?.code
                );
              }
              price = round(price / conversionRate);
              commission = round(commission / conversionRate);
            }
            return {
              ...i,
              ...(i?.currency?.name?.toLowerCase() !== "usd" && {
                price,
                commission,
                currency: {
                  ...i.currency,
                  conversionRate,
                },
              }),
            };
          })
        ),
      ],
      position: trade.currentPosition,
    };
  }

  // Process existing open forex trades
  for (let trade of allForexOpen) {
    forex[trade.symbol] = {
      trades: [
        await Promise.all(
          trade.executions?.map(async (i) => {
            let conversionRate = 1;
            let price = i?.price;
            let commission = i?.commission || 0;

            if (
              i?.currency?.code &&
              i?.currency?.code?.toLowerCase() !== "usd" &&
              importVia === "brokerSync"
            ) {
              if (i?.currency?.conversionRate) {
                conversionRate = i?.currency?.conversionRate;
              } else {
                conversionRate = await convertCurrencyToUSD(
                  i?.date,
                  i?.currency?.code
                );
              }
              conversionRate = 1 / conversionRate;

              price = round(price / conversionRate, 5);
              commission = round(commission / conversionRate, 5);
            }
            return {
              ...i,
              ...(i?.currency?.name?.toLowerCase() !== "usd" && {
                price,
                commission,
                currency: {
                  ...i.currency,
                  conversionRate,
                },
              }),
            };
          })
        ),
      ],
      position: round(trade.currentPosition),
    };
  }
  for (let trade of allFutureOpen) {
    future[trade.symbol] = {
      trades: [
        await Promise.all(
          trade.executions?.map(async (i) => {
            let conversionRate = 1;
            let price = i?.price;
            let commission = i?.commission || 0;

            if (
              i?.currency?.code &&
              i?.currency?.code?.toLowerCase() !== "usd" &&
              importVia === "brokerSync"
            ) {
              if (i?.currency?.conversionRate) {
                conversionRate = i?.currency?.conversionRate;
              } else {
                conversionRate = await convertCurrencyToUSD(
                  i?.date,
                  i?.currency?.code
                );
              }
              conversionRate = 1 / conversionRate;

              price = round(price / conversionRate, 5);
              commission = round(commission / conversionRate, 5);
            }
            return {
              ...i,
              ...(i?.currency?.name?.toLowerCase() !== "usd" && {
                price,
                commission,
                currency: {
                  ...i.currency,
                  conversionRate,
                },
              }),
            };
          })
        ),
      ],
      position: round(trade.currentPosition),
    };
  }

  for (let trade of allCryptoOpen) {
    crypto[trade.symbol] = {
      trades: [
        await Promise.all(
          trade.executions?.map(async (i) => {
            let conversionRate = 1;
            let price = i?.price;
            let commission = i?.commission || 0;
            if (
              i?.currency?.code &&
              i?.currency?.code?.toLowerCase() !== "usd" &&
              importVia === "brokerSync"
            ) {
              if (i?.currency?.conversionRate) {
                conversionRate = i?.currency?.conversionRate;
              } else {
                conversionRate = await convertCurrencyToUSD(
                  i?.date,
                  i?.currency?.code
                );
              }
              price = round(price / conversionRate);
              commission = round(commission / conversionRate);
            }
            return {
              ...i,
              ...(i?.currency?.name?.toLowerCase() !== "usd" && {
                price,
                commission,
                currency: {
                  ...i.currency,
                  conversionRate,
                },
              }),
            };
          })
        ),
      ],
      position: round(trade.currentPosition),
    };
  }

  // spilt open positions and create new trades
  await Promise.all(
    filteredResults?.map(async (order) => {
      //check if order is in usd or not and convert to usd
      let price = order?.price;
      let commission = order?.commission || 0;
      let conversionRate = 1;
      if (
        order?.currency?.code &&
        order?.currency?.code?.toLowerCase() !== "usd" &&
        importVia === "brokerSync"
      ) {
        if (order?.currency?.conversionRate) {
          conversionRate = order?.currency?.conversionRate;
        } else {
          conversionRate = await convertCurrencyToUSD(
            order?.date,
            order?.currency?.code
          );
        }
        price = round(price / conversionRate, 5);
        commission = round(commission / conversionRate, 5);
      }

      // Handle undefined orderId case
      const orderIdString = order?.orderId
        ? fromSnap || isOrderIdString
          ? order?.orderId?.toString()?.trim()
          : convertToNumber(order?.orderId)?.toString()?.trim()
        : undefined; // Or you can set a fallback value like "N/A" or log a warning if undefined

      if (!orderIdString) {
        console.error("Order ID is missing or undefined for order:", order);
      }

      const order_item = {
        // broker/user details
        brokerName,
        accountId: account?.uuid,
        user: userId,
        calculationMethod: account?.calculationMethod,
        currency: {
          ...order.currency,
          conversionRate,
        },
        // basic details
        // because we get order id as strings in transactions history api
        orderId: orderIdString,
        quantity: round(Math.abs(convertToNumber(order.quantity, 5))),
        price: round(Math.abs(convertToNumber(price, 5))),
        commission: round(Math.abs(convertToNumber(order.commission, 5))),
        // TO DO: add timezone to date if required
        date: order?.date,
        assetClass: order.assetClass,
        symbol: order.symbol,
        side: order.side?.toLowerCase(),

        // for options
        ...(order?.underlyingSymbol && {
          underlyingSymbol: order?.underlyingSymbol,
        }),
        ...(order?.contractMultiplier && {
          contractMultiplier: convertToNumber(order?.contractMultiplier),
        }),
        ...(order?.strike && {
          strike: Math.abs(convertToNumber(order?.strike)),
        }),
        // TO DO: add timezone to date if required
        ...(order?.expDate && {
          expDate: order?.expDate,
        }),
        ...(order?.isExercised && {
          isExercised: order?.isExercised,
        }),
        ...(order?.isExercised && {
          closePrice: round(order?.closePrice, 5),
        }),
        ...(order?.instrument && {
          instrument: order?.instrument,
        }),

        // for forex
        ...(order?.assetClass === "forex" && {
          swap: Math.abs(convertToNumber(order?.swap)),
        }),
        ...(order?.assetClass === "forex" && {
          profit: Math.abs(convertToNumber(order?.profit)),
        }),
      };

      if (order?.assetClass === "option") {
        const data = options[order?.symbol];
        if (data?.trades?.length) {
          if (data.position === 0) {
            options[order?.symbol].trades.push([order_item]);
            options[order?.symbol].position =
              order.side === "buy" ? order.quantity : -order.quantity;
          } else {
            try {
              options[order?.symbol].trades.at(-1).push(order_item);
            } catch (err) {
              console.log("order_item: ", err, order_item);
            }
            options[order?.symbol].position = round(
              options[order?.symbol].position +
                (order.side === "buy" ? order.quantity : -order.quantity)
            );
          }
        } else {
          options[order?.symbol] = {
            trades: [[order_item]],
            position: order.side === "buy" ? order.quantity : -order.quantity,
          };
        }
      } else if (order?.fx_rate) {
      } else if (order?.assetClass === "stocks") {
        const data = stocks[order?.symbol];
        if (data?.trades?.length) {
          if (data?.position === 0) {
            stocks[order?.symbol].trades.push([order_item]);
            stocks[order?.symbol].position =
              order.side === "buy" ? order.quantity : -order.quantity;
          } else {
            try {
              stocks[order?.symbol].trades.at(-1).push(order_item);
            } catch (err) {
              console.log("order_item: ", err, order_item);
            }
            // stocks[order?.symbol].trades.at(-1).push(order_item);
            stocks[order?.symbol].position = round(
              stocks[order?.symbol].position +
                (order.side === "buy" ? order.quantity : -order.quantity)
            );
          }
        } else {
          stocks[order?.symbol] = {
            trades: [[order_item]],
            position: order.side === "buy" ? order.quantity : -order.quantity,
          };
        }
      } else if (order?.assetClass === "forex") {
        const data = forex[order?.symbol];
        if (data?.trades?.length) {
          if (data?.position === 0) {
            forex[order?.symbol].trades.push([order_item]);
            forex[order?.symbol].position =
              order.side === "buy" ? order.quantity : -order.quantity;
          } else {
            try {
              forex[order?.symbol].trades.at(-1).push(order_item);
            } catch (err) {
              console.log("order_item: ", err, order_item);
            }
            forex[order?.symbol].position = round(
              forex[order?.symbol].position +
                (order.side === "buy" ? order.quantity : -order.quantity),
              5
            );
          }
        } else {
          forex[order?.symbol] = {
            trades: [[order_item]],
            position: order.side === "buy" ? order.quantity : -order.quantity,
          };
        }
      } else if (order?.assetClass === "future") {
        const data = future[order?.symbol];
        if (data?.trades?.length) {
          if (data?.position === 0) {
            future[order?.symbol].trades.push([order_item]);
            future[order?.symbol].position =
              order.side === "buy" ? order.quantity : -order.quantity;
          } else {
            try {
              future[order?.symbol].trades.at(-1).push(order_item);
            } catch (err) {
              console.log("order_item: ", err, order_item);
            }
            future[order?.symbol].position = round(
              future[order?.symbol].position +
                (order.side === "buy" ? order.quantity : -order.quantity),
              5
            );
          }
        } else {
          future[order?.symbol] = {
            trades: [[order_item]],
            position: order.side === "buy" ? order.quantity : -order.quantity,
          };
        }
      } else if (order?.assetClass === "crypto") {
        const data = crypto[order?.symbol];
        if (data?.trades?.length) {
          if (data?.position === 0) {
            crypto[order?.symbol].trades.push([order_item]);
            crypto[order?.symbol].position =
              order.side === "buy" ? order.quantity : -order.quantity;
          } else {
            try {
              crypto[order?.symbol].trades.at(-1).push(order_item);
            } catch (err) {
              console.log("order_item: ", err, order_item);
            }
            // crypto[order?.symbol].trades.at(-1).push(order_item);
            crypto[order?.symbol].position = round(
              crypto[order?.symbol].position +
                (order.side === "buy" ? order.quantity : -order.quantity)
            );
          }
        } else {
          crypto[order?.symbol] = {
            trades: [[order_item]],
            position: order.side === "buy" ? order.quantity : -order.quantity,
          };
        }
      }
    })
  );
  // save stocks
  Object.entries(stocks).map(([symbol, { trades, position }]) => {
    save({
      trades,
      tradeType: "stocks",
      brokerName,
      userId,
      importVia,
      timeZone,
      account,
      symbol,
      longCal,
      shortCal,
      fromSnap,
    });
  });
  // save options
  Object.entries(options).map(([symbol, { trades, position }]) => {
    save({
      trades,
      tradeType: "option",
      brokerName,
      userId,
      importVia,
      timeZone,
      account,
      symbol,
      longCal: optionsLongCal,
      shortCal: optionsShortCal,
      fromSnap,
    });
  });
  //save futures
  Object.entries(future).map(([symbol, { trades, position }]) => {
    save({
      trades,
      tradeType: "future",
      brokerName,
      userId,
      importVia,
      timeZone,
      account,
      symbol,
      longCal: optionsLongCal,
      shortCal: optionsShortCal,
      fromSnap,
    });
  });
  // save forex
  batchProcess({
    data: forex,
    tradeType: "forex",
    brokerName,
    userId,
    importVia,
    timeZone,
    account,
    longCal: forexLongCal,
    shortCal: forexShortCal,
    fromSnap,
  });
  // save crypto
  Object.entries(crypto).map(([symbol, { trades, position }]) => {
    saveForex({
      trades,
      tradeType: "crypto",
      brokerName,
      userId,
      importVia,
      timeZone,
      account,
      symbol,
      longCal,
      shortCal,
    });
  });

  return;
};
module.exports = saveTrades;
