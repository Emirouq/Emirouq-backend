const { clientUrl } = require("../../config/keys");
const BrokerSync = require("../../models/BrokerSync.model");
const User = require("../../models/User.model");
const { loginSnapTradeUser } = require("../../utils/SnapTrade.util");

const reconnectSnapLink = async (req, res, next) => {
  try {
    //broker uuid
    const { _id: userId } = req.user;
    let { broker, accountId, brokerSyncId } = req.body;

    const userDetails = await User.findOne({
      _id: userId,
    });

    const brokerSyncDetails = await BrokerSync.findOne({
      uuid: brokerSyncId,
      userId: userDetails.uuid,
    });

    if (!brokerSyncDetails?.details?.brokerage_authorization)
      throw new Error("This broker can't be reconnected.");

    const details = await loginSnapTradeUser({
      userId: userDetails.uuid,
      userSecret: userDetails.snapTrade.userSecret,
      broker,
      immediateRedirect: true,
      customRedirect: `${clientUrl}/snap-link/redirect?accountId=${accountId}&broker=${broker}`,
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

module.exports = reconnectSnapLink;
