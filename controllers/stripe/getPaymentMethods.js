const UserModel = require("../../models/User.model");
const stripe = require("../../services/stripe/getStripe");

const getPaymentMethods = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const existingUser = await UserModel.findOne({ uuid: currentUser?.uuid });
    if (!existingUser) {
      throw new Error("User not found");
    } else if (existingUser?.stripe?.subscriptionStatus === "inactive") {
      throw new Error("Subscription is not active");
    }
    let default_payment_method = "";
    let fingerprint = "";

    if (existingUser?.stripe?.subscriptionId) {
      // since for every new card added, the default payment method changes
      // since fingerprint is unique for every card, we can get the fingerprint of the default payment method

      const subscription = await stripe.subscriptions.retrieve(
        existingUser?.stripe?.subscriptionId
      );
      default_payment_method = subscription?.default_payment_method;
      // fetching fingerprint of the default payment method
      if (default_payment_method) {
        const card = await stripe.paymentMethods.retrieve(
          default_payment_method
        );
        fingerprint = card?.card?.fingerprint;
      }
    }
    //if old users don't have fingerprint, we can update it
    if (!!existingUser?.stripe?.fingerPrint === false && fingerprint) {
      await UserModel.findOneAndUpdate(
        { uuid: currentUser?.uuid },
        {
          $set: {
            ...(fingerprint && { "stripe.fingerPrint": fingerprint }),
          },
        }
      );
    }
    // fetch all payment methods
    const paymentMethods = await stripe.customers.listPaymentMethods(
      existingUser.stripe.customerId
    );

    res.status(200).json({
      success: true,
      data: paymentMethods.data,
      default_payment_method,
      fingerprint,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getPaymentMethods;
