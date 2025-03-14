const httpErrors = require("http-errors");
const Account = require("../../models/Account.model");
const User = require("../../models/User.model");
const { v4: uuid } = require("uuid");
const addAccount = async (req, res, next) => {
  try {
    const { accountName, calculationMethod, accountLocation, currency } =
      req.body;
    const { uuid: userId } = req.user;

    const isExist = await Account.findOne({
      accountName,
      user: userId,
      accountLocation,
      currency,
    });
    if (isExist) {
      throw httpErrors.BadRequest("You already have an account with this name");
    }
    const account = new Account({
      uuid: uuid(),
      accountName,
      user: userId,
      calculationMethod,
      accountLocation,
      currency,
    });
    await account.save();
    const user = await User.findOne({ uuid: userId });
    user.accounts.push(account?.uuid);
    await user.save();

    res.status(200).json({
      message: "Account added successfully",
      account,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = addAccount;
