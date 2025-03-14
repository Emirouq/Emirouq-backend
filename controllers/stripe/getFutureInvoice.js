const UserModel = require("../../models/User.model");
const stripe = require("../../services/stripe/getStripe");

const getFutureInvoice = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const existingUser = await UserModel.findOne({ uuid: currentUser?.uuid });
    if (!existingUser) {
      throw new Error("User not found");
    } else if (existingUser.stripe.subscriptionStatus === "inactive") {
      throw new Error("Subscription is not active");
    }

    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      subscription: existingUser.stripe.subscriptionId,
      expand: ["discounts"],
    });

    // const subscriptionDetails = await stripe.subscriptions.retrieve(
    //   existingUser.stripe.subscriptionId
    // );

    res.status(200).json({
      success: true,
      data: upcomingInvoice,
      // subscriptionDetails,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getFutureInvoice;
