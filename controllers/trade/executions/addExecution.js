const httpErrors = require("http-errors");
const { v4: uuid } = require("uuid");
const dayjs = require("dayjs");

const Trade = require("../../../models/Trade.model");
const Execution = require("../../../models/Execution.model");
const shortCal = require("../../../services/trade/shortCal");
const longCal = require("../../../services/trade/longCal");
const optionsShortCal = require("../../../services/trade/optionsShortCal");
const optionsLongCal = require("../../../services/trade/optionsLongCal");
const {
  utcTimeToDate,
  utcDate,
} = require("../../../services/util/dayjsHelperFunctions");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const realizeMultipleService = require("../../../services/trade/realize-multiple.service");

dayjs.extend(utc);
dayjs.extend(timezone);

const addExecutions = async (req, res, next) => {
  try {
    const { list } = req.body;
    const { timeZone } = req.user;
    if (!list || list?.length === 0) {
      return next(httpErrors(400, "Execution is required"));
    }
    const trade = await Trade.findOne({ uuid: req.params.tradeId });
    if (!trade) {
      return next(httpErrors(404, "Trade not found"));
    }

    const tradeExecutions = await Execution.find({ tradeId: trade?.uuid });
    let executionList = [
      ...tradeExecutions?.map((i) => {
        return {
          ...i?._doc,
          date: dayjs(i?.date)
            .tz(timeZone || "America/New_York")
            .format("YYYY-MM-DD HH:mm:ss"),
        };
      }),
      ...list.map((item) => ({
        date: utcTimeToDate({
          date: item?.date,
          time: item?.time,
          timeZone,
        }),
        sortDate: dayjs(`${item?.date} ${item?.time}`).format(
          "YYYY-MM-DD HH:mm:ss"
        ),
        quantity: Math.abs(+item?.quantity),
        side: item?.side?.toLowerCase(),
        price: +item?.price,
        commission: Math.abs(+item?.commission),
        orderId: uuid(),
        brokerName: "manual",
        accountId: trade?.accountId,
        calculationMethod: trade?.calculationMethod,
        importVia: "manual",
        ...(item?.expDate && {
          // expDate: utcDate({
          //   date: dayjs(item?.expDate)?.format("YYYY-MM-DD"),
          // }),
          expDate: dayjs(item?.expDate).format("YYYY-MM-DD"),
        }),
        ...(item?.instrument && {
          instrument: item?.instrument?.toLowerCase(),
        }),
        ...(item?.strike && {
          strike: +item?.strike,
        }),
        ...(item?.contractMultiplier && {
          contractMultiplier: +item?.contractMultiplier,
        }),
      })),
    ];

    //this sorting is used to fetch if the trade is short or not
    // if first execution is sell then it is short trade

    const sortExecutionList = executionList.sort((a, b) => {
      return (
        new Date(a?.uuid ? a.date : a?.sortDate) -
        new Date(b?.uuid ? b.date : b?.sortDate)
      );
    });
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
        grossPnl: calculationsResult?.total_gross_profit_wa,
        netPnl: calculationsResult?.total_net_profit_wa,
        netRoi: calculationsResult?.roi_wa,
      };
      trade.fifo = {
        grossPnl: calculationsResult?.total_gross_profit_fifo,
        netPnl: calculationsResult?.total_net_profit_fifo,
        netRoi: calculationsResult?.roi_fifo,
      };
      trade.adjustedCost = calculationsResult?.adjusted_cost_total;
      trade.adjustedProceed = calculationsResult?.adjusted_proceed_total;
      trade.entryPrice = calculationsResult?.entry_price;
      trade.exitPrice = calculationsResult?.exit_price;
      trade.avgEntryPrice = calculationsResult?.average_entry;
      trade.avgExitPrice = calculationsResult?.average_exit;
      trade.totalCommission = calculationsResult?.total_commission;
      trade.currentPosition = calculationsResult?.current_position;
      trade.openDate = calculationsResult?.open_date;
      trade.side = calculationsResult?.side;
      trade.totalQuantity = calculationsResult?.total_quantity;
      if (calculationsResult?.close_date) {
        trade.closeDate = calculationsResult?.close_date;
      } else {
        trade.latestExecutionDate = sortExecutionList?.at(-1)?.date;
      }
      if (calculationsResult?.current_position === 0) {
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

      const executions = await Promise.all(
        calculationsResult?.executions?.map(async (j, index) => {
          if (j?.uuid) {
            const existingExecution = await Execution.findOneAndUpdate(
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
            return existingExecution?.uuid;
          }
          const newExecution = await Execution.create({
            ...j,
            uuid: uuid(),
            tradeId: trade?.uuid,
            currentPosition: j?.current_position,
            wa: j?.wa,
            fifo: j?.fifo,
            index: index + 1,
          });
          return newExecution?.uuid;
        })
      );
      // await Execution.insertMany(execution);
      // trade.executions = [
      //   ...trade.executions,
      //   ...execution?.map((i) => i?.uuid),
      // ];
      await Trade.findOneAndUpdate(
        { uuid: trade?.uuid },
        { $set: { executions } },
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
    } catch (err) {
      throw err;
    }
    // const updatedExecutions = await Execution.find({
    //   tradeId: trade?.uuid,
    // });
    res.status(200).json({
      message: "Execution added successfully",
      // data: {
      //   ...trade._doc,
      //   executions: updatedExecutions.sort((a, b) => {
      //     return dayjs(a?.date).isAfter(dayjs(b?.date)) ? 1 : -1;
      //   }),
      // },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = addExecutions;
