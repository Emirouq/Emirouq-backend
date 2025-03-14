const httpErrors = require("http-errors");
const Account = require("../../models/Account.model");
const Trade = require("../../models/Trade.model");
const Execution = require("../../models/Execution.model");
const BrokerSync = require("../../models/BrokerSync.model");
const updateAccount = async (req, res, next) => {
  try {
    const { accountName, calculationMethod, accountLocation, currency } =
      req.body;
    const { uuid: userId } = req.user;
    const { id } = req.params;
    const account = await Account.findOne({ uuid: id });
    if (!account) {
      throw httpErrors(404, "Account not found");
    }
    if (accountName !== account?.accountName) {
      const isNameExists = await Account.findOne({
        accountName,
        user: userId,
        accountLocation,
        currency,
      });
      if (isNameExists) throw httpErrors(400, "Account name already exists");
    }
    const data = await Account.findOneAndUpdate(
      {
        uuid: id,
      },
      {
        ...(accountName && { accountName }),
        ...(calculationMethod && { calculationMethod }),
        ...(accountLocation && { accountLocation }),
        ...(currency && { currency }),
      },
      { new: true }
    );

    if (calculationMethod)
      await Promise.all([
        Trade.updateMany(
          {
            accountId: account.uuid,
          },
          {
            $set: {
              ...(calculationMethod && { calculationMethod }),
            },
          }
        ),
        Execution.updateMany(
          {
            accountId: account.uuid,
          },
          {
            $set: {
              ...(calculationMethod && { calculationMethod }),
            },
          }
        ),
        BrokerSync.updateMany(
          {
            accountId: account.uuid,
          },
          {
            $set: {
              ...(accountName && { accountName }),
            },
          }
        ),
      ]);

    res.status(200).json({
      message: "Account added successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updateAccount;
