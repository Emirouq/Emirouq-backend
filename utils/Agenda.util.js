// const Agenda = require("agenda");

// const { host, environmental } = require("../config/keys");
// const generateQuesTradeAPIToken = require("../services/brokerSync/QT/fetchQTToken/generateAPIToken");
// const BrokerSyncModel = require("../models/BrokerSync.model");
// const Account = require("../models/Account.model");
// const syncIB = require("./brokerSync/IB/syncIB");
// const { sendEmail } = require("../services/util/sendEmail");
// const { getSocket } = require("./socket/io.utils");
// const fetchQuesTradeData = require("../services/brokerSync/QT/fetchQTToken/fetchQuesTradeData");
// const formatQuesTrade = require("../services/brokerSync/QT/formatQuesTrade");
// const dayjs = require("dayjs");
// const { quesTradeErrorList } = require("./QuestradeError");
// const { getUserAccountOrders } = require("./SnapTrade.util");
// const UserModel = require("../models/User.model");
// const saveTrades = require("../services/saveTrades");
// const convertToNumber = require("../services/util/convertToNumber");

// let configureMongoDBObj = {
//   db: {
//     address: `${host.dbUrl}`,
//     collection: "agendaJobs",
//     options: {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     },
//   },
// };
// const agenda = new Agenda(configureMongoDBObj);
// // Global settings
// agenda.defaultLockLifetime(5 * 60 * 1000);  // 5 minutes default
// agenda.processEvery('30 seconds');

// agenda.define(
//   "Update QuesTrade Access Token",
//   {
//     lockLifetime: 5 * 60 * 1000, // 5 minutes
//   },
//   async (job, done) => {
//     console.log("job: ", job.attrs.data);
//     try {
//       const broker = await BrokerSyncModel.findOne({
//         uuid: job.attrs.data.uuid,
//       });
//       if (!broker?.uuid) {
//         done();
//         return;
//       }
//       if (broker?.status === "failed") {
//         done();
//         return;
//       }
//       const updatedTokens = await generateQuesTradeAPIToken(
//         broker?.details?.refresh_token
//       );
//       broker.details = {
//         ...updatedTokens,
//         accountId: broker?.details?.accountId,
//       };
//       await broker.save();
//     } catch (err) {
//       console.error("Error while updating questrade token");
//     }
//     done();
//   }
// );

// agenda.define(
//   "Sync Broker Data",
//   {
//     lockLifetime: 10 * 60 * 1000, // 10 minutes
//   },
//   async (job, done) => {
//     let io;
//     let broker;
//     try {
//       io = getSocket();

//       broker = await BrokerSyncModel.findOne({
//         uuid: job?.attrs?.data?.uuid,
//       });
//       if (!broker?.uuid) {
//         done();
//         return;
//       }
//       if (broker?.status === "failed") {
//         done();
//         return;
//       }
//       io?.sockets.in(broker?.userId).emit("syncing", {
//         status: "progress",
//         id: broker?.uuid,
//       });
//       broker.status = "syncing";
//       await broker.save();
//       if (broker?.broker === "interactiveBrokers") {
//         await syncIB({
//           broker: broker,
//           importVia: "brokerSync",
//           timeZone: "America/New_York",
//         });
//       } else if (broker?.broker === "quesTrade") {
//         const executions = await fetchQuesTradeData({
//           accessToken: broker?.details?.access_token,
//           brokerName: broker?.broker,
//           quesTradeAccount: broker?.details?.accountId,
//           accountId: broker?.accountId,
//           apiServer: broker?.details?.api_server,
//           importVia: "brokerSync",
//           ...(broker?.lastSuccessSyncAt
//             ? {
//                 date: dayjs(broker.lastSuccessSyncAt)
//                   .subtract(1, "day")
//                   .format("YYYY-MM-DD"),
//               }
//             : broker?.lastSyncedAt
//             ? {
//                 date: dayjs(broker?.lastSyncedAt).format("YYYY-MM-DD"),
//               }
//             : {
//                 date: dayjs(job?.attrs?.data?.syncDate).format("YYYY-MM-DD"),
//               }),
//         });
//         if (executions?.executions?.length)
//           await formatQuesTrade({
//             array: executions?.executions,
//             brokerName: broker?.broker,
//             accountId: broker?.accountId,
//             userId: broker?.userId,
//             importVia: "brokerSync",
//           });
//       }
//       broker.lastSuccessSyncAt = dayjs().format();
//       broker.lastSyncedAt = dayjs().format();
//       broker.nextSyncAt = dayjs().add(1, "hour");
//       broker.status = "success";
//       broker.error = "";
//       await broker.save();
//       io?.sockets.in(broker?.userId).emit("syncing", {
//         status: "uploaded",
//         id: broker?.uuid,
//       });
//     } catch (err) {
//       console.error("Error while auto syncing Broker", err);
//       if (broker?.uuid) {
//         broker.status = "failed";
//         broker.lastSyncedAt = broker?.lastSyncedAt
//           ? dayjs(broker?.lastSyncedAt).format()
//           : dayjs(job?.attrs?.data?.syncDate).format();

//         let errorDetails;

//         if (broker?.broker === "quesTrade") {
//           errorDetails = {
//             message:
//               quesTradeErrorList[err?.response?.status]?.[
//                 err?.response?.data?.code || err?.response?.statusText
//               ] ||
//               err?.response?.data?.message ||
//               err?.message ||
//               String(err) ||
//               "An unknown error occurred",
//           };
//         } else {
//           errorDetails = {
//             message:
//               String(err) ||
//               err?.response?.data?.message ||
//               err?.message ||
//               "An unknown error occurred",
//             stack: err?.stack || null, // Include this if you want to send stack trace
//           };
//         }
//         broker.error = errorDetails?.message;
//         await broker?.save();
//         // Prepare the error details to send to the client

//         if (io) {
//           io?.sockets.in(broker?.userId).emit("syncing", {
//             status: "error",
//             errorDetails,
//             id: broker?.uuid,
//           });
//         }
//       }

//       // await sendEmail(
//       //   ["suryapratapbbr21@gmail.com", "masafvi48@gmail.com"],
//       //   `TradeLizer (${environmental.nodeEnv}) ${broker.broker} auto sync failed`,
//       //   `<div>${JSON.stringify(errorDetails)}</div>`
//       // );
//     }
//     done();
//   }
// );

// agenda.define(
//   "Sync Snap Data",
//   {
//     lockLifetime: 10 * 60 * 1000, // 10 minutes
//   },
//   async (job, done) => {
//     let io;
//     let broker;
//     try {
//       io = getSocket();

//       broker = await BrokerSyncModel.findOne({
//         uuid: job?.attrs?.data?.uuid,
//       });
//       if (!broker?.uuid) {
//         done();
//         return;
//       }
//       // if (broker?.status === "failed") {
//       //   done();
//       //   return;
//       // }
//       io?.sockets.in(broker?.userId).emit("syncing", {
//         status: "progress",
//         id: broker?.uuid,
//       });
//       broker.status = "syncing";
//       await broker.save();

//       const userDetails = await UserModel.findOne({
//         uuid: broker.userId,
//       });

//       const accountDetails = await Account.findOne({
//         uuid: broker.accountId,
//       });

//       // save snaptrade results
//       const data = await getUserAccountOrders({
//         userId: broker?.userId,
//         userSecret: userDetails.snapTrade.userSecret,
//         accountId: broker.details.id,
//       });
//       let allOrderIds = [];

//       const trades = data.map((data) => {
//         allOrderIds.push(data["brokerage_order_id"]?.toString()?.trim());
//         return {
//           orderId: data["brokerage_order_id"]?.toString()?.trim(),
//           assetClass: data?.option_symbol?.id ? "option" : "stocks",
//           symbol: data["universal_symbol"]?.symbol?.trim()?.toUpperCase(),
//           date: data["time_executed"],
//           quantity: Math.abs(convertToNumber(data["total_quantity"])),
//           price: Math.abs(convertToNumber(data["execution_price"])),
//           // TODO: fees is not coming in api response as of now. Update it when we get a solution
//           commission: Math.abs(convertToNumber(data["fees"] || 0)),
//           side:
//             data["action"] === "SELL" ||
//             data["action"] === "SHORT" ||
//             data["action"] === "SELL_SHORT" ||
//             data["action"] === "SELL_OPEN" ||
//             data["action"] === "SELL_CLOSE"
//               ? "sell"
//               : "buy",

//           // for options

//           ...(data?.option_symbol?.id && {
//             // multiplier is not in the api response
//             contractMultiplier: convertToNumber(data["Multiplier"] || 100),
//           }),
//           ...(data?.option_symbol?.id && {
//             strike: Math.abs(
//               convertToNumber(data?.option_symbol?.strike_price)
//             ),
//           }),
//           ...(data?.option_symbol?.id && {
//             expDate: data?.option_symbol?.expiration_date,
//             // expDate: utcDate({ date: data["Expiration"] }),
//           }),
//           ...(data?.option_symbol?.id && {
//             instrument: data?.option_symbol?.option_type?.toLowerCase(),
//           }),
//         };
//       });

//       await saveTrades({
//         trades,
//         account: accountDetails?._doc,
//         allOrderIds,
//         timeZone: timeZone?.[0],
//         brokerName: broker.broker,
//         userId: broker.userId,
//         importVia: "brokerSync",
//       });

//       broker.lastSuccessSyncAt = dayjs().format();
//       broker.lastSyncedAt = dayjs().format();
//       broker.nextSyncAt = dayjs().add(1, "hour");
//       broker.status = "success";
//       broker.error = "";
//       await broker.save();
//       io?.sockets.in(broker?.userId).emit("syncing", {
//         status: "uploaded",
//         id: broker?.uuid,
//       });
//     } catch (err) {
//       if (broker) {
//         broker.status = "failed";
//         broker.lastSyncedAt = dayjs().format();
//         broker.nextSyncAt = dayjs().add(1, "hour");
//         broker.error = err?.response?.data?.message || err?.message || err;
//         await broker.save();

//         // send error email
//         await sendEmail(
//           ["suryapratapbbr21@gmail.com", "masafvi48@gmail.com"],
//           `TradeLizer (${environmental.nodeEnv}) snaptrade auto sync failed`,
//           `<div>${JSON.stringify(err)}</div>`
//         );
//       }
//     }
//     done();
//   }
// );

// agenda.on("ready", async () => await agenda.start());
// let graceful = () => {
//   agenda.stop(() => process.exit(0));
// };
// process.on("SIGTERM", graceful);
// process.on("SIGINT", graceful);

// module.exports = agenda;
