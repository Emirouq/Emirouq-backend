const { clientUrl } = require("../../config/keys");
const BrokerSync = require("../../models/BrokerSync.model");
const User = require("../../models/User.model");
const { loginSnapTradeUser } = require("../../utils/SnapTrade.util");

const updateDisconnectStatus = async (req, res, next) => {
  try {
    //broker uuid

    const { id } = req.params;

    const brokerSyncDetails = await BrokerSync.findOne({
      "details.brokerage_authorization": id,
    });

    if (!brokerSyncDetails?._id) throw new Error("Broker not found.");

    await BrokerSync.findOneAndUpdate(
      {
        "details.brokerage_authorization": id,
      },
      {
        $set: {
          isDisconnected: false,
        },
      },
      { new: true }
    );

    res.status(200).json({
      message: "Fetched brokers successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updateDisconnectStatus;
