const dayjs = require("dayjs");
const convertToNumber = require("../util/convertToNumber");
const { round } = require("../../utils/numberUtils");
const { convertToUtcExpiration } = require("../util/dayjsHelperFunctions");

/**
 *
 * @param {*} transactions
 * @param {*} orders
 *
 * @description This function returns a union of transactions and orders lists from snaptrade.
 *
 * @returns {*} { finalExecutionsList, allExecutionIds }
 */

const makeTransactionOrderUnion = (transactions, orders) => {
  const finalExecutionsList = [];

  // maintaining this array to filter transactions list at the end. This array tracks the transaction ids that maps to orders.
  const transactionsFound = [];

  // orders list that directly maps to transactions
  const newOrders = [];

  // orders list that do not direct map to transactions. This includes both that are grouped to a txn and those who do not exist in txn (very new orders most likely)
  const notFound = [];
  orders.map((order) => {
    const tradeType =
      order?.symbol?.symbol?.id || order?.universal_symbol?.symbol
        ? "stocks"
        : "option";
    let found =
      tradeType === "stocks"
        ? transactions.find(
            (i) =>
              (order.limit_price
                ? +order?.limit_price === Math.abs(i?.amount)
                : i.price === +order?.execution_price) &&
              i.symbol.symbol === order?.universal_symbol?.symbol &&
              Math.abs(+i?.units) === Math.abs(+order?.filled_quantity)
          )
        : transactions.find(
            (i) =>
              (order.limit_price
                ? +order?.limit_price === Math.abs(i?.amount)
                : i.price === +order?.execution_price) &&
              i?.option_symbol?.ticker === order?.option_symbol?.ticker &&
              Math.abs(+i?.units) === Math.abs(+order?.filled_quantity)
          );
    if (found) {
      transactionsFound.push(found.id);
      newOrders.push({
        ...order,
        commission: Math.abs(found.fee),
        transactionId: found.id,
      });
    } else {
      notFound.push(order);
    }
  });

  // Following grouping is done to find similar type not found orders for a particular day
  //
  const notFoundGrouped = {};

  notFound.forEach((order) => {
    const tradeType = order?.universal_symbol?.id ? "stocks" : "option";
    const stockSymbol = `${order?.universal_symbol?.symbol}-${
      order?.action
    }-${dayjs(order?.time_executed).format("DD-MM-YYYY")}`;
    const optionSymbol = order?.option_symbol?.ticker;
    const objKey = tradeType === "stocks" ? stockSymbol : optionSymbol;
    if (!notFoundGrouped[objKey]) notFoundGrouped[objKey] = [];
    notFoundGrouped[objKey].push(order);
  });

  // orders that are very new, they do not exist in transactions
  const latestOrders = [];
  Object.entries(notFoundGrouped).forEach(([key, value]) => {
    var sum = 0;
    var count = 0;

    for (var i = 0; i < value.length; ++i) {
      sum = round(
        sum + +value[i].execution_price * +value[i].filled_quantity,
        6
      );
      count = round(count + +value[i].filled_quantity, 6);
    }
    const average = round(sum / count, 6);
    const tradeType = value[0]?.universal_symbol?.symbol ? "stocks" : "option";
    const found = transactions.find(
      (i) =>
        // i.type === order?.action &&
        round(i.price, 3) === round(average, 3) &&
        (tradeType === "stocks"
          ? i.symbol.symbol === value?.[0]?.universal_symbol?.symbol
          : i?.option_symbol?.ticker === value?.[0]?.option_symbol?.ticker) &&
        round(Math.abs(+i.units), 4) === round(Math.abs(+count), 4)
    );
    if (found) {
      transactionsFound.push(found.id);
      newOrders.push(
        ...value.map((v) => ({
          ...v,
          commission: round(
            Math.abs(found.fee) *
              (Math.abs(+v.filled_quantity) / Math.abs(+count)),
            3
          ),
          transactionId: found.id,
        }))
      );
    } else {
      latestOrders.push(...value);
    }
  });
  const allOrderIds = [];
  latestOrders.forEach((data) => {
    allOrderIds.push(data["brokerage_order_id"]?.toString()?.trim());
    finalExecutionsList.push({
      orderId: data["brokerage_order_id"]?.toString()?.trim(),
      type: data?.["description"]
        ? data?.["description"]?.toLowerCase()?.includes("short")
          ? "short"
          : "long"
        : ["SHORT", "COV", "SELL_SHORT", "BUY_COVER"].includes(data?.["action"])
        ? "short"
        : "long",
      assetClass: data?.option_symbol?.id ? "option" : "stocks",
      symbol:
        data["universal_symbol"]?.symbol?.trim()?.toUpperCase() ||
        data?.option_symbol?.ticker?.trim()?.toUpperCase(),
      underlyingSymbol: data?.option_symbol?.underlying_symbol?.symbol
        ?.trim()
        ?.toUpperCase(),
      date: data["time_executed"],
      quantity: round(Math.abs(convertToNumber(data["total_quantity"] || 0))),
      price: round(Math.abs(convertToNumber(data["execution_price"] || 0))),
      // type: data?.["description"]?.toLowerCase()?.includes("short")
      //   ? "short"
      //   : "long",
      // TODO: fees is not coming in api response as of now. Update it when we get a solution
      commission: round(Math.abs(convertToNumber(data["commission"] || 0))),
      side:
        data["action"] === "SELL" ||
        data["action"] === "SHORT" ||
        data["action"] === "SELL_SHORT" ||
        data["action"] === "SELL_OPEN" ||
        data["action"] === "SELL_CLOSE"
          ? "sell"
          : "buy",

      // for options

      ...(data?.option_symbol?.id && {
        // multiplier is not in the api response
        contractMultiplier: convertToNumber(data["Multiplier"] || 100),
      }),
      ...(data?.option_symbol?.id && {
        strike: Math.abs(convertToNumber(data?.option_symbol?.strike_price)),
      }),
      ...(data?.option_symbol?.id && {
        expDate: data?.option_symbol?.expiration_date,
        // expDate: utcDate({ date: data["Expiration"] }),
      }),
      ...(data?.option_symbol?.id && {
        instrument: data?.option_symbol?.option_type?.toLowerCase(),
      }),
    });
  });
  newOrders.forEach((data) => {
    allOrderIds.push(data["brokerage_order_id"]?.toString()?.trim());
    finalExecutionsList.push({
      orderId: data["brokerage_order_id"]?.toString()?.trim(),
      type: data?.["description"]
        ? data?.["description"]?.toLowerCase()?.includes("short")
          ? "short"
          : "long"
        : ["SHORT", "COV", "SELL_SHORT", "BUY_COVER"].includes(data?.["action"])
        ? "short"
        : "long",
      assetClass: data?.option_symbol?.id ? "option" : "stocks",
      symbol:
        data["universal_symbol"]?.symbol?.trim()?.toUpperCase() ||
        data?.option_symbol?.ticker?.trim()?.toUpperCase(),
      underlyingSymbol: data?.option_symbol?.underlying_symbol?.symbol
        ?.trim()
        ?.toUpperCase(),
      date: data["time_executed"],
      quantity: round(Math.abs(convertToNumber(data["total_quantity"] || 0))),
      price: round(Math.abs(convertToNumber(data["execution_price"] || 0))),
      // TODO: fees is not coming in api response as of now. Update it when we get a solution
      commission: round(Math.abs(convertToNumber(data["commission"] || 0))),
      side:
        data["action"] === "SELL" ||
        data["action"] === "SHORT" ||
        data["action"] === "SELL_SHORT" ||
        data["action"] === "SELL_OPEN" ||
        data["action"] === "SELL_CLOSE"
          ? "sell"
          : "buy",

      // for options

      ...(data?.option_symbol?.id && {
        // multiplier is not in the api response
        contractMultiplier: convertToNumber(data["Multiplier"] || 100),
      }),
      ...(data?.option_symbol?.id && {
        strike: Math.abs(convertToNumber(data?.option_symbol?.strike_price)),
      }),
      ...(data?.option_symbol?.id && {
        expDate: data?.option_symbol?.expiration_date,
        // expDate: utcDate({ date: data["Expiration"] }),
      }),
      ...(data?.option_symbol?.id && {
        instrument: data?.option_symbol?.option_type?.toLowerCase(),
      }),
    });
  });
  transactions
    .filter((txn) => !transactionsFound.includes(txn.id))
    .forEach((data) => {
      const isExercised = [
        "OPTIONEXPIRATION",
        "OPTIONEXERCISE",
        "OPTIONASSIGNMENT",
      ].includes(data["type"]);
      const side =
        data["type"]?.toLowerCase() === "sell" ||
        data["type"] === "OPTIONEXPIRATION" ||
        data["type"] === "OPTIONEXERCISE" ||
        data["type"] === "OPTIONASSIGNMENT"
          ? "sell"
          : "buy";
      allOrderIds.push(data["id"]);
      finalExecutionsList.push({
        orderId: data["id"],
        type: data?.["description"]?.toLowerCase()?.includes("short")
          ? "short"
          : "long",
        assetClass:
          // if expired or exercised, then it is an option
          data?.["option_symbol"]?.id
            ? "option"
            : data?.["symbol"]?.id
            ? "stocks"
            : "",
        symbol:
          data?.symbol?.symbol?.trim()?.toUpperCase() ||
          data?.option_symbol?.ticker?.trim()?.toUpperCase(),
        underlyingSymbol: data?.option_symbol?.underlying_symbol?.symbol
          ?.trim()
          ?.toUpperCase(),
        // this function is called , since, the expiration date is the start of the day, so we need to convert it to end of the day
        // if will are not converting, then expired options will be shown at the top of the list , for  a trade
        // since expired will be shown at the bottom of the trade executions, we need to convert the date at the end of the day
        date: isExercised
          ? convertToUtcExpiration(data?.["trade_date"])
          : data?.["trade_date"],
        currency: {
          code: data?.["currency"]?.["code"]?.toLowerCase() || "usd",
          name: data?.["currency"]?.["name"] || "US Dollar",
          ...(data?.["fx_rate"] && {
            conversionRate: data?.["fx_rate"],
          }),
        },
        quantity: round(Math.abs(convertToNumber(data["units"]))),
        // incase of options, price is in cents so dividing by 100
        price: data?.["option_symbol"]?.id
          ? round(
              Math.abs(convertToNumber(data["amount"] / (data["units"] * 100)))
            )
          : round(Math.abs(convertToNumber(data["price"]))),
        commission: round(Math.abs(convertToNumber(data["fee"]))),
        side: side?.toLowerCase(),

        // for options
        ...(data?.["option_symbol"]?.["underlying_symbol"]?.["symbol"] && {
          underlyingSymbol: data?.["option_symbol"]?.["underlying_symbol"]?.[
            "symbol"
          ]
            ?.trim()
            ?.toUpperCase(),
        }),
        ...(data?.["option_symbol"]?.id && {
          contractMultiplier: 100,
        }),
        ...(data?.["option_symbol"]?.["strike_price"] && {
          strike: Math.abs(
            convertToNumber(data?.["option_symbol"]?.["strike_price"])
          ),
        }),
        ...(data?.["option_symbol"]?.["expiration_date"] && {
          expDate: data?.["option_symbol"]?.["expiration_date"],
        }),
        ...(data?.["option_symbol"]?.option_type?.toLowerCase() && {
          instrument: data?.["option_symbol"]?.option_type?.toLowerCase(),
        }),
        //if exercised || expired
        ...(isExercised && {
          isExercised: true,
        }),
        ...(isExercised && {
          closePrice: round(Math.abs(convertToNumber(data["price"]))),
        }),
      });
    });

  return { finalExecutionsList, allExecutionIds: allOrderIds };
};

module.exports = makeTransactionOrderUnion;
