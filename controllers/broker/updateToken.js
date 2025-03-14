const httpErrors = require("http-errors");
const BrokerSyncModel = require("../../models/BrokerSync.model");
const { v4: uuid } = require("uuid");
const dayjs = require("dayjs");
const generateQuesTradeAPIToken = require("../../services/brokerSync/QT/fetchQTToken/generateAPIToken");
const { quesTradeErrorList } = require("../../utils/QuestradeError");
const updateToken = async (req, res, next) => {
  try {
    //broker uuid
    const { id } = req.params;
    let { reportId, flexToken } = req.body;
    const broker = await BrokerSyncModel.findOne({
      uuid: id,
    });
    if (!broker) {
      throw httpErrors(404, "Broker not found");
    }

    await BrokerSyncModel.findOneAndUpdate(
      {
        uuid: id,
      },
      {
        $set: {
          ...(flexToken && {
            "details.flexToken": flexToken,
          }),
          ...(reportId && {
            "details.reportId": reportId,
          }),
        },
      },
      { new: true }
    );

    res.status(200).json({
      message: "Fetched brokers successfully",
      data: broker,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updateToken;
