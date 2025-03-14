const UserModel = require("../../models/User.model");
const Account = require("../../models/Account.model");
const _ = require("lodash");
const SyncIB = require("../../utils/brokerSync/IB/syncIB");
const dayjs = require("dayjs");
const {
  waitUntilInitialSyncCompleted,
  listAccountActivities,
  getUserAccountHoldings,
  getDetailBrokerageAuthorization,
} = require("../../utils/SnapTrade.util");
const saveTrades = require("../saveTrades");
const { emitSocketEvent } = require("../util/callApi.utils");
const makeTransactionOrderUnion = require("./makeTransactionOrderUnion");
const separateLongShortTransactionsQuestrade = require("./separateLongShortTransactionsQuestrade");
const Executions = require("../../models/Execution.model");
const syncMT = require("../../utils/brokerSync/MT/syncMT");
const syncKraken = require("../../utils/brokerSync/Kraken/syncKraken");

const syncBroker = async ({ userId, broker }) => {
  try {
    const userDetails = await UserModel.findOne({
      uuid: broker?.userId,
    });

    const latestExecution = await Executions.findOne({
      accountId: broker?.accountId,
    }).sort({
      date: -1,
    });
    const isNotFirstSync = broker?.lastSuccessSyncAt && latestExecution?._id;
    if (broker.snaptrade) {
      const accountDetails = await Account.findOne({
        uuid: broker.accountId,
      });
      let allOrderIds = [];
      let trades = [];

      if (
        broker.broker === "QUESTRADE" ||
        broker.broker === "QUESTRADE-UNOFFICIAL"
      ) {
        await waitUntilInitialSyncCompleted({
          userId: broker?.userId,
          userSecret: userDetails.snapTrade.userSecret,
          accountId: broker.details.id,
        });
        const detailBrokerageAuthorization =
          await getDetailBrokerageAuthorization({
            userId: broker?.userId,
            userSecret: userDetails?.snapTrade?.userSecret,
            accountId: broker?.details?.brokerage_authorization,
          });
        if (detailBrokerageAuthorization?.disabled) {
          broker.isDisconnected = true;
          await broker.save();
          throw new Error(
            "Broker authorization is disable. Please reconnect again."
          );
        }

        const transactions = await listAccountActivities({
          userId: broker?.userId,
          userSecret: userDetails.snapTrade.userSecret,
          accountId: broker.details.id,
          // type: transactionType(broker?.broker),
          ...(isNotFirstSync && {
            startDate: dayjs(latestExecution?.date)
              .subtract(2, "days")
              .format("YYYY-MM-DD"),
          }),
        });
        const { finalExecutionsList } = makeTransactionOrderUnion(
          transactions.filter((i) => i.symbol || i.option_symbol),
          []
        );

        const { long, short } =
          separateLongShortTransactionsQuestrade(finalExecutionsList);

        await Promise.all([
          await saveTrades({
            trades: long?.finalExecutionsList,
            account: accountDetails?._doc,
            allOrderIds: long?.allLongTradeIds,
            timeZone: userDetails?.timeZone,
            brokerName: broker.broker,
            userId: broker.userId,
            importVia: "brokerSync",
            fromSnap: true,
          }),
          await saveTrades({
            trades: short?.finalExecutionsList,
            account: accountDetails?._doc,
            allOrderIds: short?.allShortTradeIds,
            timeZone: userDetails?.timeZone,
            brokerName: broker.broker,
            userId: broker.userId,
            importVia: "brokerSync",
            fromSnap: true,
          }),
        ]);
        // }
      } else {
        await waitUntilInitialSyncCompleted({
          userId: broker?.userId,
          userSecret: userDetails.snapTrade.userSecret,
          accountId: broker.details.id,
        });

        const detailBrokerageAuthorization =
          await getDetailBrokerageAuthorization({
            userId: broker?.userId,
            userSecret: userDetails?.snapTrade?.userSecret,
            accountId: broker?.details?.brokerage_authorization,
          });
        if (detailBrokerageAuthorization?.disabled) {
          broker.isDisconnected = true;
          await broker.save();
          throw new Error(
            "Broker authorization is disable. Please reconnect again."
          );
        }

        const transactions = await listAccountActivities({
          userId: broker?.userId,
          userSecret: userDetails.snapTrade.userSecret,
          accountId: broker.details.id,
          // type: transactionType(broker.broker),
          ...(isNotFirstSync && {
            startDate: dayjs(latestExecution?.date)
              .subtract(2, "days")
              .format("YYYY-MM-DD"),
          }),
        });

        const { finalExecutionsList, allExecutionIds } =
          makeTransactionOrderUnion(
            transactions?.filter((i) => i.symbol || i.option_symbol),
            []
          );
        trades = finalExecutionsList;
        allOrderIds = allExecutionIds;
        await saveTrades({
          trades,
          account: accountDetails?._doc,
          allOrderIds,
          timeZone: userDetails?.timeZone,
          brokerName: broker.broker,
          userId: broker.userId,
          importVia: "brokerSync",
          fromSnap: true,
        });
      }
      const userHoldings = await getUserAccountHoldings({
        userId: broker?.userId,
        userSecret: userDetails.snapTrade.userSecret,
        accountId: broker.details.id,
      });

      //save account information
      const accountInformation = {
        balance: userHoldings?.account?.balance?.total?.amount
          ? +userHoldings?.account?.balance?.total?.amount
          : 0,
        totalValues: userHoldings?.total_value?.value
          ? +userHoldings?.total_value?.value
          : 0,
        accountBalance: userHoldings?.balances,
        positions: [
          ...userHoldings?.positions,
          ...userHoldings?.option_positions,
        ]?.map((i) => {
          return {
            tradeType: i?.symbol?.symbol?.id ? "stocks" : "option",
            symbol:
              i?.symbol?.option_symbol?.underlying_symbol?.symbol ||
              i?.symbol?.symbol?.symbol,
            rawSymbol: i?.symbol?.symbol?.rawSymbol,
            units: i.units,
            price: i.price,
          };
        }),
      };
      broker.accountInformation = accountInformation;
    } else if (broker.broker === "interactiveBrokers") {
      await SyncIB({
        broker,
        importVia: "brokerSync",
        timeZone: userDetails?.timeZone,
      });
    }
    //Write a condition for mt4 or mt5 here
    else if (broker.broker === "mt4" || broker.broker === "mt5") {
      await syncMT({
        broker,
        importVia: "brokerSync",
        timeZone: userDetails?.timeZone,
        ...(isNotFirstSync
          ? {
              startTime: dayjs(latestExecution?.date)
                .subtract(2, "days")
                .format("YYYY-MM-DD"),
            }
          : {
              startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            }),
      });
    } else if (broker.broker === "kraken") {
      syncKraken({
        broker,
        importVia: "brokerSync",
        timeZone: userDetails?.timeZone,
        ...(isNotFirstSync
          ? {
              startTime: dayjs(latestExecution?.date)
                .subtract(2, "days")
                .unix(),
            }
          : {
              startTime: dayjs(broker?.details?.startDate).unix(),
            }),
      });
    }
    broker.nextSyncAt = dayjs().add(1, "hour");
    broker.lastSuccessSyncAt = dayjs().format();
    broker.lastSyncedAt = dayjs().format();
    broker.status = "success";
    broker.error = "";
    await broker.save();

    // emit socket
    await emitSocketEvent({
      body: {
        //room Id
        room: userId,
        // key is the event name
        key: "syncing",
        // this id helps us to update the context state for a specific broker

        id: broker.uuid,
        // status is the status of the event
        status: "uploaded",
        // error is the error message
        error: null,
      },
    });
  } catch (error) {
    let errorDetails = {
      message:
        error?.response?.data?.message ||
        error?.message ||
        String(error) ||
        "An unknown error occurred",
      stack: error?.stack || null, // Include this if you want to send stack trace
    };
    if (error.status === 503) {
      errorDetails = {
        message: error.responseBody.detail || "Broker is down for maintenance",
        stack: error?.stack || null, // Include this if you want to send stack trace
      };
    }

    //  throw new Error("Broker is unavailable");
    broker.status = "failed";
    broker.error = errorDetails?.message;
    await broker.save();

    // emit socket
    await emitSocketEvent({
      body: {
        //room Id
        room: userId,
        // key is the event name
        key: "syncing",
        // this id helps us to update the context state for a specific broker

        id: broker.uuid,
        // status is the status of the event
        status: "error",
        // error is the error message
        error: errorDetails,
      },
    });
  }
};

module.exports = { syncBroker };
