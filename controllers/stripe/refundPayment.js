const UserModel = require("../../models/User.model");
const Transaction = require("../../models/Transaction.model");
const stripe = require("../../services/stripe/getStripe");

const refundPayment = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const existingUser = await UserModel.findOne({ uuid: currentUser?.uuid });
    if (!existingUser) {
      throw new Error("User not found");
    } else if (existingUser.stripe.subscriptionStatus === "inactive") {
      throw new Error("Subscription is not active");
    }
    const subscription = await stripe.subscriptions.retrieve(
      existingUser.stripe.subscriptionId
    );
    await stripe.refunds.create({
      payment_intent: subscription.default_payment_method,
      amount: 1000,
    });

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = refundPayment;
