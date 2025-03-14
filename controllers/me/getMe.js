const httpErrors = require("http-errors");
const User = require("../../models/User.model");
const stripe = require("../../services/stripe/getStripe");

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
    // if (!existingUser?.stripe?.customerId) {
    //   // create stripe customer
    //   const customer = await stripe.customers.create({
    //     email: existingUser.email,
    //     name: `${existingUser.firstName} ${existingUser.lastName}`,
    //   });
    //   existingUser.stripe.customerId = customer.id;
    //   await existingUser.save();
    // }

    const [user] = await User.aggregate([
      {
        $match: {
          uuid: currentUser?.uuid,
        },
      },
    ]);

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
