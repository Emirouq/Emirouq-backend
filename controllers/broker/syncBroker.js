const BrokerSyncModel = require("../../models/BrokerSync.model");
const JobModel = require("../../models/Job.model");
const Account = require("../../models/Account.model");
const httpErrors = require("http-errors");

const {
  syncBroker: syncBrokerService,
} = require("../../services/brokers/syncBroker");
const {
  emitSocketEvent,
  createAgenda,
} = require("../../services/util/callApi.utils");
const User = require("../../models/User.model");
const syncBroker = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { uuid: userId } = req.user;
    const user = await User.findOne({ uuid: userId });
    if (user?.stripe?.subscriptionStatus === "inactive") {
      throw new Error("Please subscribe to a plan to sync brokers");
    }
    const broker = await BrokerSyncModel.findOne({ uuid: id });
    const accountExist = await Account.findOne({ uuid: broker.accountId });
    if (!accountExist) {
      throw httpErrors(404, "Account not found");
    }

    // //here we checking, is job already exist or not if not then we create a job for the brokers
    const jobs = await JobModel.findOne({ "data.uuid": broker.uuid });

    if (!jobs) {
      if (
        ["interactiveBrokers", "mt5", "mt4", "kraken"]?.includes(broker?.broker)
      ) {
        await createAgenda({
          name: "Sync Broker Data",
          scheduleTime: "1 hour",
          data: broker?._doc,
          skipImmediate: true,
        });
      } else {
        await createAgenda({
          name: "Update Snaptrade Commission",
          scheduleTime: "1 day",
          data: broker?._doc,
          skipImmediate: true,
        });
      }
    }

    // // emit socket
    await emitSocketEvent({
      body: {
        //room Id
        room: userId,
        // key is the event name
        key: "syncing",
        // this id helps us to update the context state for a specific broker

        id: broker.uuid,
        // status is the status of the event
        status: "progress",
        // error is the error message
        error: null,
      },
    });

    broker.status = "syncing";
    await broker.save();
    res.json({
      message: "Syncing broker...",
      broker,
    });
    if (broker?.uuid) syncBrokerService({ broker, userId });
  } catch (error) {
    next(error);
  }
};

module.exports = syncBroker;
