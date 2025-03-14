const httpErrors = require("http-errors");
const { v4: uuidV4 } = require("uuid");
const User = require("../../models/User.model");
const Account = require("../../models/Account.model");
const BrokerSync = require("../../models/BrokerSync.model");
const { listUserAccounts } = require("../../utils/SnapTrade.util");
const agenda = require("../../utils/Agenda.util");
const { default: axios } = require("axios");

const snap_brokerage_master = require("../../config/snap_brokerage_master.json");
const { createAgenda } = require("../../services/util/callApi.utils");

const accountCreateRedirect = async (req, res, next) => {
  try {
    const { uuid } = req.user;
    const { accountId, snapAccountId } = req.body;
    const userData = await User.findOne({
      uuid,
    });

    // fetch all snaptrade accounts for this userId
    const snapTradeAccounts = await listUserAccounts({
      userId: userData?.uuid,
      userSecret: userData.snapTrade.userSecret,
    });

    // get the account details for which we are generating the brokerage link
    const accountDetails = await Account.findOne({
      uuid: accountId,
    });

    // get all the existing broker sync records
    const existingBrokerSync = await BrokerSync.find({
      userId: uuid,
    });

    // broker sync on account id
    const existingSync = existingBrokerSync.find(
      (i) => i.accountId === accountId
    );
    if (existingSync?.uuid)
      throw httpErrors.BadRequest("This account already has a broker synced.");

    const existingBrokerIds = [];
    existingBrokerSync.forEach((i) => {
      if (i?.snapTrade?.accountId)
        existingBrokerIds.push(i?.snapTrade?.accountId);
    });

    // const newAccounts = snapTradeAccounts.filter(
    //   (i) => !existingBrokerIds.includes(i.id)
    // );
    const newAccountData = snapTradeAccounts.find(
      (i) => i.id === snapAccountId
    );
    const master_record = snap_brokerage_master.find(
      (i) => i.display_name === newAccountData.institution_name
    );
    const newBrokerSync = new BrokerSync({
      uuid: uuidV4(),
      userId: uuid,
      accountName: accountDetails?.accountName,
      accountId: accountDetails?.uuid,
      broker: master_record?.slug || newAccountData?.institution_name,
      details: newAccountData,
      snaptrade: true,
      status: "success",
    });
    await newBrokerSync.save();

    await createAgenda({
      name: "Update Snaptrade Commission",
      scheduleTime: "1 day",
      data: newBrokerSync,
    });

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = accountCreateRedirect;
