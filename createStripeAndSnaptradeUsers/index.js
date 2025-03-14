const AccountModel = require("../models/Account.model");
const Users = require("../models/User.model");
const stripe = require("../services/stripe/getStripe");
const { registerSnapTradeUser } = require("../utils/SnapTrade.util");

const createStripeCustomer = async () => {
  const users = await Users.find({});

  for (let x of users) {
    const customer = await stripe.customers.create({
      email: x.email,
      name: `${x.firstName} ${x.lastName}`,
    });

    await Promise.all([
      Users.findOneAndUpdate(
        { uuid: x?.uuid },
        {
          $set: {
            stripe: {
              customerId: customer.id,
              subscriptionStatus: "inactive",
            },
            limits: {
              accounts: 10,
              backtesting: false,
              storage: 1,
              plan: "free",
            },
          },
        }
      ),
      AccountModel.updateMany(
        { user: x?.uuid },
        {
          $set: {
            status: "active",
          },
        }
      ),
    ]);
  }
};

const createSnapCustomer = async () => {
  const users = await Users.find({});
  for (let user of users) {
    const snapUser = await registerSnapTradeUser(user?.uuid);
    if (snapUser?.userSecret)
      await Users.findOneAndUpdate(
        { uuid: user?.uuid },
        { $set: { snaptrade: { userSecret: snapUser?.userSecret } } }
      );
  }
  // await Promise.all(
  //   users.map(async (user) => {
  //     const snapUser = await registerSnapTradeUser(user?.uuid);
  //     if (snapUser?.userSecret)
  //       await Users.findOneAndUpdate(
  //         { uuid: user?.uuid },
  //         { $set: { snaptrade: { userSecret: snapUser?.userSecret } } }
  //       );
  //   })
  // );
};

module.exports = { createStripeCustomer, createSnapCustomer };
