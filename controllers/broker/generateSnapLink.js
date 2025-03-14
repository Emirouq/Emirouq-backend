// const httpErrors = require("http-errors");
const { clientUrl } = require("../../config/keys");
const User = require("../../models/User.model");
const { loginSnapTradeUser } = require("../../utils/SnapTrade.util");
// const { v4: uuid } = require("uuid");
// const dayjs = require("dayjs");
// const generateQuesTradeAPIToken = require("../../services/brokerSync/QT/fetchQTToken/generateAPIToken");
// const { quesTradeErrorList } = require("../../utils/QuestradeError");
const generateSnapLink = async (req, res, next) => {
  try {
    //broker uuid
    const { _id: userId } = req.user;
    let { broker, accountId } = req.body;

    const userDetails = await User.findOne({
      _id: userId,
    });

    const details = await loginSnapTradeUser({
      userId: userDetails.uuid,
      userSecret: userDetails.snapTrade.userSecret,
      broker,
      immediateRedirect: true,
      customRedirect: `${clientUrl}/snap-link/redirect?accountId=${accountId}&broker=${broker}`,
    });

    res.status(200).json({
      message: "Fetched brokers successfully",
      data: details.redirectURI,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = generateSnapLink;
