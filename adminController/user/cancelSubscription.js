const User = require("../../models/User.model");
const stripe = require("../../services/stripe/getStripe");
const cancelSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ uuid: id });
    // fetch the accounts by created date
    if (!user) {
      throw new Error("User not found");
    }
    // //cancel stripe subscription
    // if (user.stripe.subscriptionId)
    //   await stripe.subscriptions.cancel(user.stripe.subscriptionId);

    // cancel the subscription at the end of the billing period
    if (user?.stripe?.subscriptionId) {
      if (user?.stripe?.subscriptionId)
        await stripe.subscriptions.update(user?.stripe?.subscriptionId, {
          cancel_at_period_end: true,
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
            "stripe.cancel_at": subscription?.current_period_end,
            "stripe.canceled_at": subscription?.canceled_at,
          },
        },
        { new: true }
      );
    }
    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = cancelSubscription;
