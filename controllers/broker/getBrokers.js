const httpErrors = require("http-errors");
const BrokerSyncModel = require("../../models/BrokerSync.model");
const { v4: uuid } = require("uuid");
const getBrokers = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;
    const { accountIds } = req.query;
    const broker = await BrokerSyncModel.find(
      {
        userId,
        accountId: { $in: accountIds?.split(",") },
      },
      {
        details: 0,
      }
    );

    res.status(200).json({
      message: "Fetched brokers successfully",
      data: broker,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getBrokers;
