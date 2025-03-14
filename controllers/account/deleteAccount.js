const httpErrors = require("http-errors");
const Account = require("../../models/Account.model");
const User = require("../../models/User.model");
const Trade = require("../../models/Trade.model");
const Executions = require("../../models/Execution.model");
const BrokerSync = require("../../models/BrokerSync.model");
const { v4: uuid } = require("uuid");
const { deleteAgenda } = require("../../services/util/callApi.utils");
const deleteAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const brokersSynced = await BrokerSync.find({ accountId: id });

    await Promise.all([
      // delete the account
      Account.findOneAndDelete({ uuid: id }),
      // remove the account from the user's account list
      User.findOneAndUpdate(
        { uuid: req.user.uuid },
        { $pull: { accounts: id } },
        { new: true }
      ),
      // delete all trades related to the account
      Trade.deleteMany({ accountId: id }),
      // delete all executions related to the trade
      Executions.deleteMany({
        accountId: id,
      }),
      //delete broker sync data
      BrokerSync.deleteMany({ accountId: id }),
    ]);
    await Promise.all(
      brokersSynced.map(async (item) => {
        try {
          await deleteAgenda({
            id: item?.uuid,
          });
        } catch (error) {
          console.error("Error deleting agenda", error);
        }
      })
    );

    res.json({
      message: "Account deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = deleteAccount;
