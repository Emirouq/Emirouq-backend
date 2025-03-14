const _ = require("lodash");
const short = require("short-uuid");
const { v4: uuid } = require("uuid");
const Executions = require("../../models/Execution.model");
const Trades = require("../../models/Trade.model");
const { utcDate } = require("../util/dayjsHelperFunctions");
const convertToNumber = require("../util/convertToNumber");
const { round } = require("../../utils/numberUtils");
const {
  splitExecutions,
  createNewExecutions,
} = require("../../utils/split-executions");

let save = ({
  trades,
  tradeType,
  brokerName,
  userId,
  importVia,
  timeZone,
  account,
  symbol,
  longCal,
  shortCal,
  fromSnap,
}) => {
  // split trades by quantity and date
  // let splitTrades = [];
  // for (let x of trades) {
  //   const splitExecutionsResult = splitExecutions(x);
  //   //here we are creating trades from the executions when open position is 0
  //   const newTrades = createNewExecutions(splitExecutionsResult);
  //   splitTrades.push(...newTrades);
  // }
  trades?.map(async (tradeData) => {
    //tradeId exists
    const tradeId = tradeData?.filter((i) => i?.tradeId)[0]?.tradeId;
    const underlyingSymbol = tradeData?.filter((i) => i?.underlyingSymbol)[0]
      ?.underlyingSymbol;
    //sort execution by date
    const sortedTrade = tradeData.sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    //get trade
    let trade;
    if (tradeId) {
      trade = await Trades.findOne({ uuid: tradeId });
      trade.underlyingSymbol = underlyingSymbol;
    } else {
      trade = new Trades({
        user: userId,
        uuid: uuid(),
        tradeId: short.generate(),
        accountId: account?.uuid,
        importVia,
        symbol: symbol,
        tradeType,
        calculationMethod: account?.calculationMethod,
        brokerName,
        ...(timeZone && { timeZone }),
        ...(underlyingSymbol && {
          underlyingSymbol,
        }),
        ...(sortedTrade?.[0]?.strike && {
          strike: Math.abs(convertToNumber(sortedTrade?.[0]?.strike)),
        }),
        ...(sortedTrade?.[0]?.expDate && {
          expDate: sortedTrade?.[0]?.expDate,
        }),
        ...(sortedTrade?.[0]?.contractMultiplier && {
          contractMultiplier: Math.abs(
            convertToNumber(sortedTrade?.[0]?.contractMultiplier)
          ),
        }),
        ...(sortedTrade?.[0]?.instrument && {
          instrument: sortedTrade?.[0]?.instrument?.toLowerCase(),
        }),
      });
    }

    const calculationsResult =
      sortedTrade[0].side === "buy"
        ? await longCal(sortedTrade)
        : await shortCal(sortedTrade);
    trade.wa = {
      grossPnl: round(calculationsResult.total_gross_profit_wa || 0),
      netPnl: round(calculationsResult.total_net_profit_wa || 0),
      netRoi: round(calculationsResult.roi_wa || 0),
    };
    trade.fifo = {
      grossPnl: round(calculationsResult.total_gross_profit_fifo || 0),
      netPnl: round(calculationsResult.total_net_profit_fifo || 0),
      netRoi: round(calculationsResult.roi_fifo || 0),
    };
    trade.adjustedCost = round(calculationsResult.adjusted_cost_total || 0);
    trade.adjustedProceed = round(
      calculationsResult.adjusted_proceed_total || 0
    );
    trade.entryPrice = round(calculationsResult.entry_price || 0);
    trade.exitPrice = round(calculationsResult.exit_price || 0);

    trade.avgEntryPrice = round(calculationsResult.average_entry || 0);
    trade.avgExitPrice = round(calculationsResult.average_exit || 0);
    trade.totalCommission = round(calculationsResult.total_commission || 0);
    trade.currentPosition = round(calculationsResult.current_position || 0);
    trade.openDate = fromSnap
      ? calculationsResult.open_date
      : utcDate({ date: calculationsResult.open_date, timeZone });
    trade.side = calculationsResult.side;
    trade.totalQuantity = round(calculationsResult.total_quantity || 0);
    if (calculationsResult.close_date) {
      trade.closeDate = fromSnap
        ? calculationsResult.close_date
        : utcDate({ date: calculationsResult.close_date, timeZone });
    } else {
      trade.latestExecutionDate = fromSnap
        ? sortedTrade.at(-1)?.date
        : utcDate({
            date: sortedTrade.at(-1)?.date,
            timeZone,
          });
    }

    if (calculationsResult?.current_position === 0) {
      trade.status = "closed";
      trade.pip =
        (round(calculationsResult?.exit_price || 0) -
          round(calculationsResult?.entry_price || 0)) *
          trade.contractMultiplier || 1;

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

    const executionWithoutUuid = calculationsResult.executions
      .map((exec, index) => {
        if (exec?.uuid) {
          return;
        }
        return {
          ...exec, // this spreads date, quantity, side, price, commission
          uuid: uuid(),
          accountId: account?.uuid,
          importVia,
          calculationMethod: account?.calculationMethod,
          brokerName,
          tradeId: trade?.uuid,
          currentPosition: exec.current_position,
          wa: exec.wa,
          fifo: exec.fifo,
          date: fromSnap ? exec?.date : utcDate({ date: exec.date }),
          // for sorting
          index: +index + 1,
          ...(timeZone && { timeZone }),
          ...(exec?.strike && {
            strike: Math.abs(convertToNumber(exec?.strike)),
          }),
          ...(exec?.expDate && { expDate: exec?.expDate }),
          ...(exec?.contractMultiplier && {
            contractMultiplier: Math.abs(
              convertToNumber(exec?.contractMultiplier)
            ),
          }),
          ...(exec?.instrument && {
            instrument: exec?.instrument?.toLowerCase(),
          }),
        };
      })
      ?.filter((i) => i);

    // update the existing executions
    await Promise.all(
      calculationsResult.executions
        .map(async (exec, index) => {
          if (exec?.uuid) {
            return await Executions.findOneAndUpdate(
              { uuid: exec?.uuid },
              {
                $set: {
                  ...exec,
                  currentPosition: exec.currentPosition,
                  wa: exec.wa,
                  fifo: exec.fifo,
                  index: +index + 1,
                },
              },
              { new: true }
            );
          }
        })
        ?.filter((i) => i)
    );

    await Executions.insertMany(executionWithoutUuid);

    trade.executions = [
      ...trade.executions,
      ...executionWithoutUuid.map((exec) => exec.uuid),
    ];
    await trade.save();
  });
  return;
};

module.exports = { save };
