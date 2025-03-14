const { clientUrl } = require("../../config/keys");
const BrokerSync = require("../../models/BrokerSync.model");
const User = require("../../models/User.model");
const { loginSnapTradeUser } = require("../../utils/SnapTrade.util");

const reconnectBroker = async (req, res, next) => {
  try {
    //broker uuid
    const { _id: userId } = req.user;

    const { id } = req.params;
    const userDetails = await User.findOne({
      _id: userId,
    });

    const brokerSyncDetails = await BrokerSync.findOne({
      uuid: id,
    });

    if (!brokerSyncDetails?.details?.brokerage_authorization)
      throw new Error("This broker can't be reconnected.");

    const details = await loginSnapTradeUser({
      userId: userDetails.uuid,
      userSecret: userDetails.snapTrade.userSecret,
      broker: brokerSyncDetails?.broker,
      immediateRedirect: true,
      customRedirect: `${clientUrl}/snap-link/redirect?accountId=${brokerSyncDetails?.accountId}&broker=${brokerSyncDetails?.broker}`,
      reconnect: brokerSyncDetails?.details?.brokerage_authorization,
    });

    res.status(200).json({
      message: "Fetched brokers successfully",
      data: details.redirectURI,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = reconnectBroker;
