const httpErrors = require("http-errors");
const { v4: uuid } = require("uuid");
const dayjs = require("dayjs");

const Trade = require("../../models/Trade.model");
const Execution = require("../../models/Execution.model");

const shortCal = require("../../services/trade/shortCal");
const longCal = require("../../services/trade/longCal");
const optionsShortCal = require("../../services/trade/optionsShortCal");
const optionsLongCal = require("../../services/trade/optionsLongCal");
const { utcTimeToDate } = require("../../services/util/dayjsHelperFunctions");
const short = require("short-uuid");

const AccountModel = require("../../models/Account.model");

const addTrade = async (req, res, next) => {
  try {
    const { account, symbol, tradeType, list, timeZone } = req.body;
    const { uuid: userId } = req.user;

    const accountExist = await AccountModel.findOne({ uuid: account });
    if (!accountExist) {
      return next(httpErrors(404, "Account not found"));
    }

    const trade = new Trade({
      user: userId,
      uuid: uuid(),
      tradeId: short.generate(),
      accountId: account,
      symbol,
      tradeType,
      calculationMethod: accountExist?.calculationMethod,
      brokerName: "manual",
      importVia: "manual",
      timeZone,
      ...(list?.[0]?.expDate && {
        // expDate: utcDate({
        //   date: dayjs(list?.[0]?.expDate)?.format("YYYY-MM-DD"),
        // }),
        expDate: dayjs(list?.[0]?.expDate)?.format("YYYY-MM-DD"),
      }),
      ...(list?.[0]?.instrument && {
        instrument: list?.[0]?.instrument,
      }),
      ...(list?.[0]?.strike && { strike: +list?.[0]?.strike }),
      ...(list?.[0]?.contractMultiplier && {
        contractMultiplier: +list?.[0]?.contractMultiplier,
      }),
    });

    let executionList = list.map((x, index) => ({
      date: utcTimeToDate({
        date: x?.date,
        time: x?.time,
        timeZone,
      }),
      // for sorting
      index: +index + 1,
      quantity: Math.abs(+x.quantity),
      side: x.side,
      price: +x.price,
      timeZone,
      commission: Math.abs(+x.commission),
      orderId: uuid(),
      brokerName: "manual",
      accountId: account,
      calculationMethod: accountExist?.calculationMethod,
      importVia: "manual",
      ...(x?.expDate && {
        // expDate: utcDate({
        //   date: dayjs(x?.expDate)?.format("YYYY-MM-DD"),
        // }),
        expDate: dayjs(x?.expDate)?.format("YYYY-MM-DD"),
      }),
      ...(x?.instrument && { instrument: x?.instrument }),
      ...(x.strike && { strike: +x.strike }),
      ...(x.contractMultiplier && {
        contractMultiplier: +x.contractMultiplier,
      }),
    }));

    //this sorting is used to fetch if the trade is short or not
    // if first execution is sell then it is short trade
    const sortExecutionList = executionList.sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });
    try {
      const calculationsResult =
        tradeType === "stocks"
          ? sortExecutionList[0].side === "buy"
            ? longCal(sortExecutionList)
            : shortCal(sortExecutionList)
          : sortExecutionList[0].side === "buy"
          ? optionsLongCal(sortExecutionList)
          : optionsShortCal(sortExecutionList);

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
        trade.latestExecutionDate = sortExecutionList.at(-1)?.date;
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
      if (tradeType === "option") {
        trade.underlyingSymbol = symbol;
      }

      const executions = calculationsResult.executions.map((exec) => ({
        ...exec, // this spreads date, quantity, side, price, commission
        uuid: uuid(),
        tradeId: trade?.uuid,
        currentPosition: exec.current_position,
        wa: exec.wa,
        fifo: exec.fifo,
      }));

      await Execution.insertMany(executions);

      trade.executions = executions.map((i) => i.uuid);

      await trade.save();
    } catch (err) {
      throw new Error(err);
    }
    await trade.save();

    res.status(200).json({
      message: "Trade added successfully",
      trade,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = addTrade;
