const httpErrors = require("http-errors");
const { v4: uuid } = require("uuid");
const dayjs = require("dayjs");

const Trade = require("../../../models/Trade.model");
const Execution = require("../../../models/Execution.model");
const shortCal = require("../../../services/trade/shortCal");
const longCal = require("../../../services/trade/longCal");
const {
  utcTimeToDate,
  utcDate,
} = require("../../../services/util/dayjsHelperFunctions");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const optionsShortCal = require("../../../services/trade/optionsShortCal");
const optionsLongCal = require("../../../services/trade/optionsLongCal");
const realizeMultipleService = require("../../../services/trade/realize-multiple.service");

dayjs.extend(timezone);
dayjs.extend(utc);

const updateExecution = async (req, res, next) => {
  try {
    const {
      date,
      time,
      quantity,
      side,
      price,
      commission,
      instrument,
      expDate,
      strike,
      contractMultiplier,
    } = req.body;

    const { timeZone } = req.user;
    let trade = await Trade.findOne({ uuid: req.params.tradeId });
    if (!trade) {
      return next(httpErrors(404, "Trade not found"));
    }
    const execution = await Execution.findOneAndUpdate(
      { uuid: req.params.executionId },
      {
        ...((date || time) && {
          date: utcTimeToDate({
            date: date,
            time: time,
            timeZone,
          }),
        }),
        sortDate: dayjs(`${date} ${time}`).format("YYYY-MM-DD HH:mm:ss"),
        ...(quantity && { quantity: +quantity }),
        ...(side && { side }),
        ...(price && { price: +price }),
        ...(commission && { commission: +commission }),
        ...(instrument && {
          instrument,
        }),
        ...(expDate && {
          // expDate: utcDate({
          //   date: dayjs(expDate)?.format("YYYY-MM-DD"),
          // }),
          expDate: dayjs(expDate)?.format("YYYY-MM-DD"),
        }),
        ...(strike && { strike: strike }),
        ...(contractMultiplier && { contractMultiplier: contractMultiplier }),
      },
      {
        new: true,
      }
    );
    const tradeExecutions = await Execution.find({ tradeId: trade?.uuid }).sort(
      { date: 1 }
    );
    let sortExecutionList = tradeExecutions?.map((i) => i?._doc);

    try {
      const calculationsResult =
        trade.tradeType === "stocks"
          ? sortExecutionList[0].side === "buy"
            ? longCal(sortExecutionList)
            : shortCal(sortExecutionList)
          : sortExecutionList[0].side === "buy"
          ? optionsLongCal(sortExecutionList)
          : optionsShortCal(sortExecutionList);
      trade.wa = {
        grossPnl: +calculationsResult.total_gross_profit_wa,
        netPnl: +calculationsResult.total_net_profit_wa,
        netRoi: +calculationsResult.roi_wa,
      };
      trade.fifo = {
        grossPnl: +calculationsResult.total_gross_profit_fifo,
        netPnl: +calculationsResult.total_net_profit_fifo,
        netRoi: +calculationsResult.roi_fifo,
      };
      trade.adjustedCost = +calculationsResult.adjusted_cost_total || 0;
      trade.adjustedProceed = +calculationsResult.adjusted_proceed_total || 0;
      trade.entryPrice = +calculationsResult.entry_price || 0;
      trade.exitPrice = +calculationsResult.exit_price || 0;
      trade.avgEntryPrice = +calculationsResult.average_entry || 0;
      trade.avgExitPrice = +calculationsResult.average_exit || 0;
      trade.totalCommission = +calculationsResult.total_commission || 0;
      trade.currentPosition = +calculationsResult.current_position || 0;
      trade.openDate = calculationsResult.open_date;
      trade.side = calculationsResult.side;
      trade.totalQuantity = +calculationsResult.total_quantity || 0;
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

      await Promise.all(
        calculationsResult?.executions?.map(async (j, index) => {
          await Execution.findOneAndUpdate(
            {
              uuid: j?.uuid,
            },
            {
              index: index + 1,
              currentPosition: j?.current_position,
              wa: j?.wa,
              fifo: j?.fifo,
            },
            {
              new: true,
            }
          );
        })
      );
      // calculate planned and realizer r multiple if profit target and stop loss are set
      if (trade?.profitTarget && trade?.stopLoss) {
        const {
          initialTarget,
          tradeRisk,
          plannedRMultiple,
          realizeRMultiple,
          profitTarget: newProfitTarget,
          stopLoss: newStopLoss,
        } = await realizeMultipleService({
          profitTarget: trade?.profitTarget,
          stopLoss: trade?.stopLoss,
          avgEntryPrice: trade?.avgEntryPrice,
          totalQuantity: trade?.totalQuantity,
          totalCommission: trade?.totalCommission,
          avgExitPrice: trade?.avgExitPrice ? trade?.avgExitPrice : 0,
          side: trade?.side?.toLowerCase(),
          pnl: trade?.[trade?.calculationMethod]?.netPnl,
          contractMultiplier: trade?.contractMultiplier
            ? trade?.contractMultiplier
            : 1,
        });
        trade.profitTarget = newProfitTarget;
        trade.stopLoss = newStopLoss;
        trade.initialTarget = initialTarget;
        trade.tradeRisk = tradeRisk;
        trade.plannedRMultiple = plannedRMultiple;
        trade.realizeRMultiple = realizeRMultiple;
      }
      await trade.save();
    } catch (err) {}
    res.status(200).json({
      message: "Execution updated successfully",
      data: {
        ...trade._doc,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updateExecution;
