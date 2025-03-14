const dayjs = require("dayjs");
const { formatIBResponse } = require(".");
const updateDataSyncCsv = require("../../trade/update_dataSync_csv");
const addDataSyncCsv = require("../../trade/add_dataSync_csv");
const { utcTimeToDate } = require("../../util/dayjsHelperFunctions");
const convertToNumber = require("../../util/convertToNumber");
const saveStocks = async ({
  data,
  broker,
  accountId,
  userId,
  importVia,
  timeZone,
}) => {
  const formattedIBResponse = await new Promise((resolve) => {
    resolve(formatIBResponse({ data, broker, accountId, importVia }));
  });
  // io?.sockets.in(userId).emit("csvUpload", {
  //   percent: 20,
  //   status: "progress",
  // });
  const formattedTrades = Object.entries(formattedIBResponse).map(
    ([key, value]) => {
      return {
        symbol: key,
        tradeId: value?.tradeId,
        trades: value?.trades?.map((i) => {
          const executions = Object.entries(i)?.map(([key, value]) => {
            const date = dayjs(
              value?.["DateTime"],
              "YYYY-MM-DD HH:mm:ss"
            ).format("YYYY-MM-DD");
            const time = dayjs(
              value?.["DateTime"],
              "YYYY-MM-DD HH:mm:ss"
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
              quantity: !value?.uuid
                ? +Math.abs(convertToNumber(value?.Quantity))
                : +Math.abs(value?.quantity),
              side: value?.side,
              price: !value?.uuid
                ? convertToNumber(value?.TradePrice)
                : +value?.price,
              commission: !value?.uuid
                ? Math.abs(+convertToNumber(value?.IBCommission))
                : Math.abs(+value?.commission),
              orderId: value?.orderId?.toString(),
              // executionId: !value?.uuid ? value?.IBExecID : value?.executionId,
              brokerName: broker,
              accountId: accountId,
            };
          });
          return {
            executions,
          };
        }),
      };
    }
  );
  // io?.sockets.in(userId).emit("csvUpload", {
  //   percent: 30,
  //   status: "progress",
  // });

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
  //   percent: 40,
  //   status: "progress",
  // });
  if (updateArray?.[0]?.executions?.length) {
    await updateDataSyncCsv({
      account: accountId,
      list: updateArray,
      userId,
      brokerName: broker,
      importVia,
      timeZone,
    });
  }
  // io?.sockets.in(userId).emit("csvUpload", {
  //   percent: 50,
  //   status: "progress",
  // });
  if (newArray?.[0]?.executions?.length) {
    await addDataSyncCsv({
      account: accountId,
      list: newArray,
      userId: userId,
      tradeType: "stocks",
      brokerName: broker,
      importVia,
      timeZone,
    });
  }
  return;
};
module.exports = saveStocks;
