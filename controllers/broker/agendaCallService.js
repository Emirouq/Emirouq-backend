const BrokerSync = require("../../models/BrokerSync.model");
const Account = require("../../models/Account.model");
const httpErrors = require("http-errors");

const { syncBroker } = require("../../services/brokers/syncBroker");
const { emitSocketEvent } = require("../../services/util/callApi.utils");
const User = require("../../models/User.model");
const agendaCallService = async (req, res, next) => {
  try {
    const { userId, id } = req.body;
    const user = await User.findOne({ uuid: userId });
    // if user is not subscribed then return
    if (user?.stripe?.subscriptionStatus === "inactive") {
      return res.status(200).json({
        success: true,
      });
    }
    const broker = await BrokerSync.findOne({ uuid: id });
    const accountExist = await Account.findOne({ uuid: broker.accountId });
    if (!accountExist) {
      throw httpErrors(404, "Account not found");
    }

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

    if (broker?.uuid) syncBroker({ broker, userId });
  } catch (error) {
    next(error);
  }
};

module.exports = agendaCallService;
