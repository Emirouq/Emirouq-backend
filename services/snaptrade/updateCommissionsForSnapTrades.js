const { listAccountActivities } = require("../../utils/SnapTrade.util");
const dayjs = require("dayjs");
const { round } = require("lodash");
const Executions = require("../../models/Execution.model");
const BrokerSync = require("../../models/BrokerSync.model");
const User = require("../../models/User.model");
const Trade = require("../../models/Trade.model");
const longCal = require("../trade/longCal");
const shortCal = require("../trade/shortCal");
const optionsShortCal = require("../trade/optionsShortCal");
const optionsLongCal = require("../trade/optionsLongCal");

const updateCommissionsForSnapTrades = async (brokerSyncId) => {
  // this array is the final updated executions list for whom I received commissions data from transactions
  const finalExecutionsList = [];
  const uniqueTradeIds = [];

  const broker = await BrokerSync.findOne({
    uuid: brokerSyncId,
  });
  if (!broker?.uuid) {
    return;
  }
  const userDetails = await User.findOne({
    uuid: broker.userId,
  });

  const notFound = [];
  const executionsFromDb = await Executions.aggregate([
    {
      $match: {
        accountId: broker.accountId,
        commission: 0,
        // match only last 2 days executions
        date: {
          $gt: new Date(dayjs().subtract(2, "days").startOf("day")),
        },
      },
    },
    {
      $lookup: {
        from: "trades",
        localField: "tradeId",
        foreignField: "uuid",
        as: "tradeDetails",
      },
    },
    {
      $unwind: "$tradeDetails",
    },
  ]);
  if (!executionsFromDb?.length) return;
  const transactions = await listAccountActivities({
    userId: broker?.userId,
    userSecret: userDetails.snapTrade.userSecret,
    accountId: broker.details.id,
    startDate: dayjs().subtract(2, "days").format("YYYY-MM-DD"),
  });
  executionsFromDb.map((order) => {
    const found = transactions.find(
      (i) =>
        // i.type === order.action &&
        round(i.price, 3) === round(+order.price, 3) &&
        i.symbol.symbol === order.tradeDetails.symbol &&
        Math.abs(+i.units) === Math.abs(+order.quantity)
    );
    if (found) {
      finalExecutionsList.push({ ...order, commission: Math.abs(found.fee) });
      if (!uniqueTradeIds.includes(order.tradeId))
        uniqueTradeIds.push(order.tradeId);
    } else {
      notFound.push(order);
    }
  });

  const notFoundGrouped = {};

  notFound.forEach((order) => {
    const objKey = `${order.tradeDetails.symbol}-${order.side}-${dayjs(
      order.date
    ).format("DD-MM-YYYY")}`;
    if (!notFoundGrouped[objKey]) notFoundGrouped[objKey] = [];
    notFoundGrouped[objKey].push(order);
  });

  Object.entries(notFoundGrouped).forEach(([key, value]) => {
    var sum = 0;
    var count = 0;

    for (var i = 0; i < value.length; ++i) {
      sum += +value[i].price * +value[i].quantity;
      count += +value[i].quantity;
    }
    const average = sum / count;
    const found = transactions.find(
      (i) =>
        // i.type === order.action &&
        round(i.price, 3) === round(average, 3) &&
        i.symbol.symbol === value[0].tradeDetails.symbol &&
        Math.abs(+i.units) === Math.abs(+count)
    );
    if (found) {
      value.forEach((v) => {
        if (!uniqueTradeIds.includes(v.tradeId)) uniqueTradeIds.push(v.tradeId);
        finalExecutionsList.push({
          ...v,
          commission: round(
            Math.abs(found.fee) * (Math.abs(+v.quantity) / Math.abs(+count)),
            3
          ),
        });
      });
    }
  });

  // finalExecutionList
  // finalExecutionList loop findOneandupdae

  await Promise.all(
    finalExecutionsList.map(async (item) => {
      await Executions.findOneAndUpdate(
        { uuid: item?.uuid },
        {
          $set: {
            commission: item.commission,
          },
        },
        {
          new: true,
        }
      );
    })
  );

  // find all executions, calculate everything and update trade
  await Promise.all(
    uniqueTradeIds.map(async (tradeId) => {
      const trade = await Trade.findOne({ uuid: tradeId });
      if (!trade) return;
      const tradeExecutions = await Executions.find({
        tradeId,
      }).sort({ date: 1 });
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
            await Executions.findOneAndUpdate(
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
        await trade.save();
      } catch (err) {}
    })
  );

  // return finalExecutionsList;
};

module.exports = updateCommissionsForSnapTrades;
