const httpErrors = require("http-errors");
const { v4: uuidV4 } = require("uuid");
const User = require("../../models/User.model");
const Account = require("../../models/Account.model");
const BrokerSync = require("../../models/BrokerSync.model");
const { listUserAccounts } = require("../../utils/SnapTrade.util");
const agenda = require("../../utils/Agenda.util");

const snap_brokerage_master = require("../../config/snap_brokerage_master.json");

const listUserBrokerAccounts = async (req, res, next) => {
  try {
    const { uuid } = req.user;
    const { accountId, broker } = req.body;
    const userData = await User.findOne({
      uuid,
    });

    // fetch all snaptrade accounts for this userId
    const snapTradeAccounts = await listUserAccounts({
      userId: userData.uuid,
      userSecret: userData.snapTrade.userSecret,
    });

    const selectedBroker = snap_brokerage_master.find((i) => i.slug === broker);

    const selectedBrokerAccounts = snapTradeAccounts.filter(
      (i) => i.institution_name === selectedBroker.name
    );

    // get the account details for which we are generating the brokerage link
    // const accountDetails = await Account.findOne({
    //   uuid: accountId,
    // });

    // get all the existing broker sync records
    // const existingBrokerSync = await BrokerSync.find({
    //   userId: uuid,
    // });
    // const existingBrokerIds = [];
    // existingBrokerSync.forEach((i) => {
    //   if (i?.snapTrade?.accountId)
    //     existingBrokerIds.push(i?.snapTrade?.accountId);
    // });

    // const newAccounts = snapTradeAccounts.filter(
    //   (i) => !existingBrokerIds.includes(i.id)
    // );
    // if (newAccounts.length > 1) {
    //   console.log("/************************************/");
    //   console.log("/***** Multiple accounts added! *****/");
    //   console.log("/************************************/");
    // }
    // const newAccountData = newAccounts[0];
    // const newBrokerSync = new BrokerSync({
    //   uuid: uuidV4(),
    //   userId: uuid,
    //   accountName: accountDetails.accountName,
    //   accountId: accountDetails.uuid,
    //   broker:
    //     newAccountData.institution_name === "Questrade"
    //       ? "quesTrade"
    //       : newAccountData.institution_name,
    //   details: newAccountData,
    //   snaptrade: true,
    //   status: "success",
    // });
    // await newBrokerSync.save();

    res.status(200).json({
      success: true,
      data: selectedBrokerAccounts,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = listUserBrokerAccounts;
