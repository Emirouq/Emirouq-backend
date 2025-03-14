const { groupBySymbolId, formatQTResponse } = require(".");
const removeDuplicateRecords = require("./removeDuplicateRecords");
const _ = require("lodash");
const updateDataSyncCsv = require("../../trade/update_dataSync_csv");
const addDataSyncCsv = require("../../trade/add_dataSync_csv");
const {
  utcTimeToDate,
  // utcDate,
} = require("../../util/dayjsHelperFunctions");
const dayjs = require("dayjs");
const convertToNumber = require("../../util/convertToNumber");
const saveStocks = async ({
  array,
  brokerName,
  accountId,
  userId,
  importVia,
  timeZone,
}) => {
  const trades = await formatQTResponse({
    data: array,
    accountId,
    brokerName,
    importVia,
  });
  // io?.sockets.in(userId).emit("csvUpload", {
  //   percent: 20,
  //   status: "progress",
  // });
  const formattedTrades = Object.entries(trades).map(([key, value]) => {
    return {
      symbol: key,
      tradeId: value?.tradeId,
      trades: value?.trades?.map((i) => {
        return {
          executions: Object.entries(i)?.map(([key, value]) => {
            const date = dayjs(
              value["Updated time"],
              "DD MMM YYYY HH:mm:ss A"
            ).format("YYYY-MM-DD");
            const time = dayjs(
              value["Updated time"],
              "DD MMM YYYY HH:mm:ss A"
            ).format("HH:mm:ss");
            return {
              uuid: value?.uuid,
              tradeId: value?.tradeId,
              date: value?.uuid
                ? value?.date
                : utcTimeToDate({
                    date,
                    time,
                  }),
              quantity: Math.abs(convertToNumber(value?.quantity)),
              side: value?.side,
              price: Number(value?.price),
              commission: Math.abs(convertToNumber(value?.commission)),
              orderId: value?.orderId?.toString(),
              brokerName,
              accountId,
            };
          }),
        };
      }),
    };
  });

  const updateArray = [];
  const newArray = [];

  formattedTrades?.forEach((item) => {
    item?.trades?.forEach((trade) => {
      const hasUuid = trade?.executions.some(
        (execution) => execution?.uuid !== undefined
      );
      const hasTradeId = trade?.executions.some(
        (execution) => execution?.tradeId !== undefined
      );
      if (hasUuid && hasTradeId) {
        // const tradeWithSymbol = { ...trade, symbol: item.symbol };
        updateArray.push(trade);
      } else {
        // Include the symbol property in the trade object before pushing it to newArray
        const tradeWithSymbol = {
          ...trade,
          symbol: item.symbol?.trim()?.toUpperCase(),
        };
        newArray.push({ ...tradeWithSymbol });
      }
    });
  });
  // io?.sockets.in(userId).emit("csvUpload", {
  //   percent: 30,
  //   status: "progress",
  // });
  if (updateArray?.[0]?.executions?.length) {
    await updateDataSyncCsv({
      account: accountId,
      list: updateArray,
      userId,
      brokerName,
      importVia,
      timeZone,
    });
  }
  // io?.sockets.in(userId).emit("csvUpload", {
  //   percent: 40,
  //   status: "progress",
  // });
  console.log(JSON.stringify(newArray), "newArray");
  if (newArray?.[0]?.executions?.length) {
    await addDataSyncCsv({
      account: accountId,
      list: newArray,
      userId,
      tradeType: "stocks",
      brokerName,
      importVia,
      timeZone,
    });
  }
  // io?.sockets.in(userId).emit("csvUpload", {
  //   percent: 50,
  //   status: "progress",
  // });
  return;
};

module.exports = saveStocks;
