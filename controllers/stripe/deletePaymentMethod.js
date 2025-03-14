const UserModel = require("../../models/User.model");
const stripe = require("../../services/stripe/getStripe");

const deletePaymentMethod = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;
    const existingUser = await UserModel.findOne({ uuid: currentUser?.uuid });
    if (!existingUser) {
      throw new Error("User not found");
    } else if (existingUser.stripe.subscriptionStatus === "inactive") {
      throw new Error("Subscription is not active");
    }
    const subscription = await stripe.subscriptions.retrieve(
      existingUser.stripe.subscriptionId
    );

    // if the current subscription default payment method is the same as the one we want to delete
    // we throw an error as we can't delete the default payment
    if (subscription?.default_payment_method === id) {
      throw new Error("You can't delete the default payment method");
    }
    await stripe.paymentMethods.detach(id);

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = deletePaymentMethod;
