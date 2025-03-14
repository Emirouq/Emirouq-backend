const httpErrors = require("http-errors");
const { v4: uuid } = require("uuid");
const dayjs = require("dayjs");

const Trade = require("../../../models/Trade.model");
const Execution = require("../../../models/Execution.model");
const shortCal = require("../../../services/trade/shortCal");
const longCal = require("../../../services/trade/longCal");
const utc = require("dayjs/plugin/utc");
const optionsShortCal = require("../../../services/trade/optionsShortCal");
const optionsLongCal = require("../../../services/trade/optionsLongCal");
const realizeMultipleService = require("../../../services/trade/realize-multiple.service");

dayjs.extend(utc);
const deleteExecutions = async (req, res, next) => {
  try {
    const { executionIds } = req.body;

    const trade = await Trade.findOne({ uuid: req.params.tradeId });

    await Execution.deleteMany({ uuid: { $in: executionIds } });

    const executions = await Execution.find({ tradeId: trade?.uuid });

    if (executions.length === 0) {
      await Trade.findOneAndDelete({ uuid: req.params.tradeId });
      return res.status(200).json({ message: "Trade deleted successfully" });
    }
    let executionList = executions.map((i) => i?._doc);
    //this sorting is used to fetch if the trade is short or not
    // if first execution is sell then it is short trade
    const sortExecutionList = executionList.sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });
    try {
      const calculationsResult =
        trade.tradeType === "stocks"
          ? sortExecutionList?.[0]?.side === "buy"
            ? longCal(sortExecutionList)
            : shortCal(sortExecutionList)
          : sortExecutionList?.[0]?.side === "buy"
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
      await Trade.findOneAndUpdate(
        { uuid: req.params.tradeId },
        {
          $pull: {
            executions: {
              $in: executionIds,
            },
          },
        },
        { new: true }
      );
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
      message: "Execution deleted successfully",
      data: {
        ...trade._doc,
        executions: executions.sort((a, b) => {
          return dayjs(a?.date).isAfter(dayjs(b?.date)) ? 1 : -1;
        }),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = deleteExecutions;
