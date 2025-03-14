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

dayjs.extend(utc);
const updateDataSyncCsv = async ({
  account,
  list,
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
      // find trade ID from executions
      const tradeId = x?.executions
        ?.map((i) => i?.tradeId)
        ?.filter((i) => i)[0];

      const trade = await Trade.findOne({ uuid: tradeId });

      let executionList = x?.executions.map((x) => ({
        uuid: x?.uuid,
        date: x?.date,
        quantity: Math.abs(+x.quantity),
        side: x.side,
        price: +x.price,
        commission: Math.abs(+x.commission),
        orderId: x?.orderId?.toString()?.trim(),
        brokerName,
        accountId: account,
        calculationMethod: accountExist?.calculationMethod,
        ...(timeZone && { timeZone }),
        importVia,
        ...(x?.strike && { strike: x?.strike }),
        ...(x?.expDate && { expDate: x?.expDate }),
        ...(x?.contractMultiplier && {
          contractMultiplier: x?.contractMultiplier,
        }),
        ...(x?.instrument && { instrument: x?.instrument?.toLowerCase() }),
      }));

      try {
        // const calculationsResult =
        //   sortExecutionList[0].side === "buy"
        //     ? longCal(sortExecutionList)
        //     : shortCal(sortExecutionList);

        const calculationsResult =
          trade.tradeType === "stocks"
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

        // add uuid to the executions
        const executions = calculationsResult.executions
          .map((exec) => {
            if (exec?.uuid) {
              return;
            }
            return {
              ...exec,
              uuid: uuid(),
              tradeId: trade?.uuid,
              currentPosition: exec.current_position,
              wa: exec.wa,
              fifo: exec.fifo,
            };
          })
          ?.filter((i) => i);
        // update the existing executions
        const existedExecutions = calculationsResult.executions
          ?.map((i, index) => {
            if (i?.uuid) {
              return {
                ...i,
                index: index + 1,
              };
            }
            return;
          })
          ?.filter((i) => i);
        for (let x of existedExecutions) {
          await Execution.findOneAndUpdate(
            { uuid: x?.uuid },
            {
              $set: {
                ...x,
                currentPosition: x.current_position,
                wa: x.wa,
                fifo: x.fifo,
                index: x.index,
              },
            },
            { new: true }
          );
        }
        await Execution.insertMany(executions);

        trade.executions = [
          ...trade.executions,
          ...executions.map((exec) => exec.uuid),
        ];
        await trade.save();
      } catch (err) {
        console.log(err);
      }
      await trade.save();
    }

    return;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

module.exports = updateDataSyncCsv;
