const httpErrors = require("http-errors");
const BrokerSyncModel = require("../../models/BrokerSync.model");
const { v4: uuid } = require("uuid");
const { createAgenda } = require("../../services/util/callApi.utils");

const connectKraken = async (req, res, next) => {
  const { uuid: userId } = req.user;
  const { accountName, accountId, broker, details } = req.body;

  let saveBroker;
  try {
    const isExist = await BrokerSyncModel.findOne({
      accountId,
      broker,
      userId,
    });

    if (isExist) {
      throw httpErrors.BadRequest("You have already synced this account");
    }

    const isTokenAlreadyExist = await BrokerSyncModel.findOne({
      ...(broker === "interactiveBrokers" && {
        "details.flexToken": details.flexToken,
        "details.reportId": details.reportId,
      }),
      accountId,
    });
    if (isTokenAlreadyExist) {
      throw httpErrors.BadRequest(
        "You already have an account with this token"
      );
    }

    saveBroker = new BrokerSyncModel({
      uuid: uuid(),
      userId,
      accountName,
      accountId,
      broker,
      details,
      status: "syncing",
    });
    await saveBroker.save();

    // create a job to sync data every 1 hour for  interactiveBrokers
    await createAgenda({
      name: "Sync Broker Data",
      scheduleTime: "1 hour",
      data: saveBroker,
      immediate: false,
    });

    res.status(200).json({
      message: "Account added successfully",
      data: saveBroker,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = connectKraken;
