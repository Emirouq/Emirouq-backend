const httpErrors = require("http-errors");
const { v4: uuid } = require("uuid");
const dayjs = require("dayjs");

const Trade = require("../../models/Trade.model");
const Execution = require("../../models/Execution.model");
const shortCal = require("./shortCal");
const longCal = require("./longCal");
const utc = require("dayjs/plugin/utc");
const AccountModel = require("../../models/Account.model");
const optionsLongCal = require("./optionsLongCal");
const optionsShortCal = require("./optionsShortCal");
const short = require("short-uuid");

dayjs.extend(utc);
const addDataSyncCsv = async ({
  account,
  list,
  userId,
  tradeType,
  brokerName,
  importVia,
  timeZone,
}) => {
  try {
    for (let x of list) {
      const accountExist = await AccountModel.findOne({ uuid: account });
      if (!accountExist) {
        throw httpErrors(404, "Account not found");
      }

      const trade = new Trade({
        user: userId,
        uuid: uuid(),
        tradeId: short.generate(),
        accountId: account,
        symbol: x.symbol,
        tradeType,
        calculationMethod: accountExist?.calculationMethod,
        brokerName,
        importVia,
        ...(x?.underlyingSymbol && { underlyingSymbol: x?.underlyingSymbol }),
        ...(timeZone && { timeZone }),
      });
      await trade.save();

      let executionList = x?.executions.map((x) => ({
        date: x?.date,
        quantity: Math.abs(+x.quantity),
        side: x.side,
        price: +x.price,
        commission: Math.abs(+x.commission),
        orderId: x?.orderId?.toString()?.trim(),
        brokerName,
        accountId: account,
        calculationMethod: accountExist?.calculationMethod,
        importVia,
        ...(x?.strike && { strike: x?.strike }),
        ...(x?.expDate && { expDate: x?.expDate }),
        ...(x?.contractMultiplier && {
          contractMultiplier: x?.contractMultiplier,
        }),
        ...(x?.instrument && { instrument: x?.instrument?.toLowerCase() }),
        ...(timeZone && { timeZone }),
      }));

      //this sorting is used to fetch if the trade is short or not
      // if first execution is sell then it is short trade
      // const sortExecutionList = executionList.sort((a, b) => {
      //   return dayjs(a?.date).isAfter(dayjs(b?.date)) ? 1 : -1;
      // });
      try {
        const calculationsResult =
          tradeType === "stocks"
            ? executionList[0].side === "buy"
              ? longCal(executionList)
              : shortCal(executionList)
            : executionList[0].side === "buy"
            ? optionsLongCal(executionList)
            : optionsShortCal(executionList);

        trade.wa = {
          grossPnl: calculationsResult.total_gross_profit_wa,
          netPnl: calculationsResult.total_net_profit_wa,
          netRoi: calculationsResult.roi_wa,
        };
        trade.fifo = {
          grossPnl: calculationsResult.total_gross_profit_fifo,
          netPnl: calculationsResult.total_net_profit_fifo,
          netRoi: calculationsResult.roi_fifo,
        };
        trade.adjustedCost = calculationsResult.adjusted_cost_total;
        trade.adjustedProceed = calculationsResult.adjusted_proceed_total;
        trade.entryPrice = calculationsResult.entry_price;
        trade.exitPrice = calculationsResult.exit_price;
        trade.avgEntryPrice = calculationsResult.average_entry;
        trade.avgExitPrice = calculationsResult.average_exit;
        trade.totalCommission = calculationsResult.total_commission;
        trade.currentPosition = calculationsResult.current_position;
        trade.openDate = calculationsResult.open_date;
        trade.side = calculationsResult.side;
        trade.totalQuantity = calculationsResult.total_quantity;
        if (calculationsResult.close_date) {
          trade.closeDate = calculationsResult.close_date;
        } else {
          trade.latestExecutionDate = executionList.at(-1)?.date;
        }
        if (calculationsResult.current_position === 0) {
          trade.status = "closed";

          // TODO: Confirm if result would be win or lose for 0 net pnl
          trade.result =
            trade?.calculationMethod === "fifo"
              ? calculationsResult.total_net_profit_fifo > 0
                ? "win"
                : "lose"
              : calculationsResult.total_net_profit_wa > 0
              ? "win"
              : "lose";
        } else {
          trade.status = "open";
          trade.result = "";
        }

        const executions = calculationsResult.executions.map((exec, index) => ({
          ...exec, // this spreads date, quantity, side, price, commission
          uuid: uuid(),
          tradeId: trade?.uuid,
          currentPosition: exec.current_position,
          wa: exec.wa,
          fifo: exec.fifo,
          index: index + 1,
        }));

        await Execution.insertMany(executions);

        trade.executions = executions.map((i) => i.uuid);

        await trade.save();
      } catch (err) {}
      await trade.save();
    }

    return;
  } catch (error) {
    throw error;
  }
};

module.exports = addDataSyncCsv;
