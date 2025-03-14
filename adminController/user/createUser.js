const { v4: uuid } = require("uuid");
const UserLoginMech = require("../../models/UserLoginMech.model");
const Category = require("../../models/Category.model");
const User = require("../../models/User.model");
const { hashPassword } = require("../../helpers/bcrypt");
const AccountModel = require("../../models/Account.model");
const stripe = require("../../services/stripe/getStripe");
const { registerSnapTradeUser } = require("../../utils/SnapTrade.util");

const createUser = async (req, res, next) => {
  try {
    let { firstName, lastName, email, userHandle } = req.body;

    email = email.trim().toLowerCase();
    userHandle = userHandle.trim().toLowerCase();

    const findUser = await User.findOne({
      $or: [
        {
          email,
        },
        {
          userHandle,
        },
      ],
    });
    if (findUser) {
      throw new Error("User already exists");
    }
    const hash = await hashPassword("123456");
    const user = new User({
      uuid: uuid(),
      firstName,
      lastName,
      email,
      userHandle: userHandle,
      // accountName: "My Trades",
      // timeZone: "America/New_York",
    });

    // const account = new AccountModel({
    //   uuid: uuid(),
    //   accountName: "My Trades",
    //   user: user?.uuid,
    //   calculationMethod: "fifo",
    // });
    // await account.save();
    const userLoginMech = new UserLoginMech({
      user: user?.uuid,
      password: hash,
    });
    // user.accounts = [account?.uuid];
    user.isActive = true;
    await userLoginMech.save();

    //create Categories
    // ["Mistakes", "Setups"]?.map(async (i) => {
    //   const category = new Category({
    //     uuid: uuid(),
    //     name: i,
    //     userId: user?.uuid,
    //     color: i === "Mistakes" ? "#ed052f" : "#FFFF00",
    //   });
    //   await category.save();
    // });

    // create stripe customer
    // const customer = await stripe.customers.create({
    //   email: user.email,
    //   name: `${user.firstName} ${user.lastName}`,
    // });
    // user.stripe = {
    //   customerId: customer.id,
    // };
    // const snapTradeUser = await registerSnapTradeUser(user?.uuid);
    // user.snapTrade = {
    //   userSecret: snapTradeUser.userSecret,
    // };

    await user.save();

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = createUser;
