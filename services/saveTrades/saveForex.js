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

let saveForex = async ({
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
  try {
    // Use Promise.all to await all trade processing
    await Promise.all(
      trades?.map(async (tradeData) => {
        const tradeId = tradeData?.filter((i) => i?.tradeId)[0]?.tradeId;
        const underlyingSymbol = tradeData?.filter(
          (i) => i?.underlyingSymbol
        )[0]?.underlyingSymbol;

        const sortedTrade = tradeData.sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        );

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
            ...(underlyingSymbol && { underlyingSymbol }),
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

        // Assume longCal and shortCal are optimized and don't have unnecessary DB calls
        const calculationsResult =
          sortedTrade[0].side === "buy"
            ? await longCal(sortedTrade)
            : await shortCal(sortedTrade);

        // **Optimization: Update trade fields only if they have changed**
        // (Add logic here to compare new calculations with existing values in 'trade' if needed)
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
        // ... (Similarly update other trade fields) ...

        // --- Executions ---
        const executionWithoutUuid = calculationsResult.executions
          .filter((exec) => !exec?.uuid) // Only new executions
          .map((exec, index) => ({
            ...exec,
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
          }));

        // **Optimization: Batch Update Existing Executions (if possible)**
        const existingExecutionsToUpdate = calculationsResult.executions.filter(
          (exec) => exec?.uuid
        );

        if (existingExecutionsToUpdate.length > 0) {
          // **Option 1: If your ORM/DB supports bulk updates:**
          const bulkUpdateOperations = existingExecutionsToUpdate.map(
            (exec) => ({
              updateOne: {
                filter: { uuid: exec.uuid },
                update: {
                  $set: {
                    ...exec,
                    currentPosition: exec.current_position,
                    wa: exec.wa,
                    fifo: exec.fifo,
                    index: calculationsResult.executions.indexOf(exec) + 1, // Calculate index
                  },
                },
              },
            })
          );

          await Executions.bulkWrite(bulkUpdateOperations);

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
          await Executions.insertMany(executionWithoutUuid);
        }

        // Update trade's executions array
        trade.executions = [
          ...trade.executions,
          ...executionWithoutUuid.map((exec) => exec.uuid),
        ];

        // Save the trade (either new or updated)
        await trade.save(); // Only save new trades here
      })
    );

    return;
  } catch (error) {
    throw error; // Re-throw the error to be handled by the caller (e.g., the queue)
  }
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function batchProcess({
  data,
  tradeType,
  brokerName,
  userId,
  importVia,
  timeZone,
  account,
  longCal,
  shortCal,
  fromSnap,
}) {
  const batchSize = 100;
  const symbols = Object.keys(data);

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = {};
    for (let j = i; j < i + batchSize && j < symbols.length; j++) {
      const symbol = symbols[j];
      batch[symbol] = data[symbol]; // Assuming 'data' is accessible here, you might need to adjust based on where 'allData' is defined in your larger code
    }

    // Process the batch (optimize within this block)
    await Promise.all(
      Object.entries(batch).map(async ([symbol, { trades }]) => {
        try {
          await saveForex({
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
          });
        } catch (error) {
          throw error;
          // Handle the error appropriately (e.g., retry, log, etc.)
        }
      })
    );

    // batch finished
    // Add delay here if needed
    await delay(1000);
  }
}

module.exports = { saveForex, batchProcess };
