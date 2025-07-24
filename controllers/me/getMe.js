const httpErrors = require("http-errors");
const User = require("../../models/User.model");
const stripe = require("../../services/stripe/getStripe");
const pushNotification = require("../../utils/pushNotification.utils");
const getMe = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const existingUser = await User.findOne({ uuid: currentUser?.uuid });
    if (!existingUser) {
      throw new httpErrors.NotFound("User not found");
    }
    if (!existingUser?.isActive) {
      throw new httpErrors.Unauthorized("User is not active");
    }
    if (!existingUser?.customerId) {
      // create stripe customer
      const customer = await stripe.customers.create({
        email: existingUser.email,
        name: existingUser.firstName,
      });
      existingUser.customerId = customer.id;
      existingUser.fullName = customer.firstName + " " + customer.lastName;
      await existingUser.save();
    }

    const [user] = await User.aggregate([
      {
        $match: {
          uuid: currentUser?.uuid,
        },
      },
    ]);
    const payload = {
      expoPushToken: "ExponentPushToken[4iX8I2Aw-Uf_DQZAJcMNIt]",
      message: {
        title: "Welcome",
        body: `Welcome back, ${user.firstName}`,
      },
    };
    // await pushNotification(payload);

    res.status(200).json({
      success: true,
      message: "Me details fetched successfully",
      data: {
        ...user,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getMe;
