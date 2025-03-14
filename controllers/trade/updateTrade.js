const httpErrors = require("http-errors");
const { v4: uuid } = require("uuid");

const Trade = require("../../models/Trade.model");
const Execution = require("../../models/Execution.model");

const shortCal = require("../../services/trade/shortCal");
const longCal = require("../../services/trade/longCal");
const optionsShortCal = require("../../services/trade/optionsShortCal");
const optionsLongCal = require("../../services/trade/optionsLongCal");
const { utcTimeToDate } = require("../../services/util/dayjsHelperFunctions");

const AccountModel = require("../../models/Account.model");
const convertToNumber = require("../../services/util/convertToNumber");

const updateTrade = async (req, res, next) => {
  try {
    const { account, symbol, tradeType, list, timeZone, removedExecutionIds } =
      req.body;
    const { tradeId } = req.params;

    const accountExist = await AccountModel.findOne({ uuid: account });
    if (!accountExist) {
      return next(httpErrors(404, "Account not found"));
    }

    const trade = await Trade.findOne({ uuid: tradeId });
    if (!trade) {
      throw new Error("Trade not found");
    }
    let executionList = list?.map((x, index) => ({
      ...x,
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
      tradeId,
      commission: Math.abs(+x.commission),
      orderId: uuid(),
      brokerName: "manual",
      accountId: account,
      calculationMethod: accountExist?.calculationMethod,
      importVia: "manual",
      ...(x?.expDate && {
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
    const sortExecutionList = executionList?.sort((a, b) => {
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

      // --- Executions ---
      const executionWithoutUuid = calculationsResult.executions
        .filter((exec) => !!exec?.uuid === false)
        .map((exec) => ({
          ...exec,
          uuid: uuid(),
        }));

      // **Optimization: Batch Update Existing Executions (if possible)**
      const existingExecutionsToUpdate = calculationsResult.executions.filter(
        (exec) => exec?.uuid
      );

      if (existingExecutionsToUpdate.length > 0) {
        // **Option 1: If your ORM/DB supports bulk updates:**
        const bulkUpdateOperations = existingExecutionsToUpdate.map((exec) => ({
          updateOne: {
            filter: { uuid: exec.uuid },
            update: {
              $set: {
                ...exec,
                currentPosition: exec.current_position,
                wa: exec.wa,
                fifo: exec.fifo,
              },
            },
          },
        }));

        await Execution.bulkWrite(bulkUpdateOperations);

        // **Option 2: If bulk updates are not supported (less efficient):**
        // await Promise.all(
        //   existingExecutionsToUpdate.map(async (exec) => {
        //     await Executions.findOneAndUpdate(
        //       { uuid: exec.uuid },
        //       {
        //         $set: {
        //           ...exec,
        //           currentPosition: exec.current_position,
        //           wa: exec.wa,
        //           fifo: exec.fifo,
        //           index: calculationsResult.executions.indexOf(exec) + 1, // Calculate index
        //         },
        //       },
        //       { new: true }
        //     );
        //   })
        // );
      }

      // Insert new executions
      if (executionWithoutUuid.length > 0) {
        await Execution.insertMany(executionWithoutUuid);
      }
      if (removedExecutionIds.length > 0) {
        await Execution.deleteMany({ uuid: { $in: removedExecutionIds } });
      }

      // Update trade's executions array
      trade.executions = [
        ...trade.executions?.filter(
          (exec) => !removedExecutionIds.includes(exec)
        ),
        ...executionWithoutUuid.map((exec) => exec.uuid),
      ];

      await trade.save();
      // Save the trade (either new or updated)
    } catch (err) {
      throw new Error(err);
    }
    res.status(200).json({
      message: "Trade updated successfully",
      trade,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updateTrade;
