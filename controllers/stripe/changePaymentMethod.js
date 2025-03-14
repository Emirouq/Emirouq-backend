const UserModel = require("../../models/User.model");
const stripe = require("../../services/stripe/getStripe");

const changePaymentMethod = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;
    const existingUser = await UserModel.findOne({ uuid: currentUser?.uuid });
    if (!existingUser) {
      throw new Error("User not found");
    } else if (existingUser.stripe.subscriptionStatus === "inactive") {
      throw new Error("Subscription is not active");
    }

    const card = await stripe.paymentMethods.retrieve(id);
    const fingerprint = card?.card?.fingerprint;
    await stripe.subscriptions.update(existingUser.stripe.subscriptionId, {
      default_payment_method: id,
    });
    await UserModel.findOneAndUpdate(
      { uuid: currentUser?.uuid },
      {
        $set: {
          ...(id && { "stripe.defaultPaymentMethod": id }),
          ...(fingerprint && { "stripe.fingerPrint": fingerprint }),
        },
      }
    );

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = changePaymentMethod;
