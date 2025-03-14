const User = require("../../models/User.model");
const stripe = require("../../services/stripe/getStripe");
const cancelNextBilling = async (req, res, next) => {
  try {
    const { uuid: id } = req.user;

    const { cancelReason, cancel_at_period_end = true } = req.body;
    // if cancel_at_period_end is true then subscription will be cancelled at the end of the billing period
    // if cancel_at_period_end is false then subscription will be renewed for the next billing period

    const user = await User.findOne({ uuid: id });
    if (!user) {
      throw new Error("User not found");
    }
    // cancel the subscription at the end of the billing period
    if (user.stripe.subscriptionId)
      await stripe.subscriptions.update(user.stripe.subscriptionId, {
        cancel_at_period_end,
      });

    const subscription = await stripe.subscriptions.retrieve(
      user.stripe.subscriptionId
    );
    await User.findOneAndUpdate(
      {
        uuid: id,
      },
      {
        $set: {
          "stripe.cancel_at": subscription?.cancel_at,
          "stripe.canceled_at": subscription?.canceled_at,
          "stripe.cancel_reason": cancelReason,
        },
        ...(!cancel_at_period_end && {
          $inc: { "stripe.renew_count": 1 },
        }),
      },
      { new: true }
    );

    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = cancelNextBilling;
