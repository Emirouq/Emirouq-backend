const httpErrors = require("http-errors");
const { v4: uuid } = require("uuid");
const ProspectUser = require("../../models/ProspectUser.model");
const UserLoginMech = require("../../models/UserLoginMech.model");
const Category = require("../../models/Category.model");
const User = require("../../models/User.model");
const { hashPassword } = require("../../helpers/bcrypt");
const AccountModel = require("../../models/Account.model");
const stripe = require("../../services/stripe/getStripe");

const setUpPassword = async (req, res, next) => {
  try {
    const { password, token } = req.body;

    // Check if the token is valid
    const verifyUser = await ProspectUser.findOne({
      token: token,
    });
    if (!verifyUser) {
      throw httpErrors.BadRequest("Invalid token");
    }
    const hash = await hashPassword(password);
    const user = new User({
      uuid: uuid(),
      firstName: verifyUser?.firstName,
      lastName: verifyUser?.lastName,
      email: verifyUser?.email,
      userHandle: verifyUser?.userHandle.toLowerCase(),
      accountName: "My Trades",
      timeZone: "America/New_York",
    });

    const account = new AccountModel({
      uuid: uuid(),
      accountName: "My Trades",
      user: user?.uuid,
      calculationMethod: "fifo",
    });
    await account.save();
    const userLoginMech = new UserLoginMech({
      user: user?.uuid,
      password: hash,
    });
    user.accounts = [account?.uuid];
    user.isActive = true;
    await userLoginMech.save();

    //create Categories
    ["Mistakes", "Setups"]?.map(async (i) => {
      const category = new Category({
        uuid: uuid(),
        name: i,
        userId: user?.uuid,
        color: i === "Mistakes" ? "#ed052f" : "#FFFF00",
      });
      await category.save();
    });

    // create stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
    });
    user.stripe = {
      customerId: customer.id,
    };
    const snapTradeUser = await registerSnapTradeUser(user?.uuid);
    user.snapTrade = {
      userSecret: snapTradeUser.userSecret,
    };

    await user.save();
    await ProspectUser.deleteMany({ email: user.email }); // Delete the token after the user has been created

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = setUpPassword;
