const UserModel = require("../../models/User.model");
const stripe = require("../../services/stripe/getStripe");
const {
  plans: { trial },
} = require("../../config/keys").stripe;

/**
 * Create stripe checkout session
 * This generates a trial period subscription, it will be changed soon
 *
 * @author Surya Pratap
 * @since 16 Jun 2024
 */
const trialPeriodCheckout = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const existingUser = await UserModel.findOne({ uuid: currentUser?.uuid });
    await stripe.subscriptions.create({
      customer: existingUser.stripe.customerId,
      items: [{ price: trial }],
      trial_period_days: 45,
      trial_settings: {
        end_behavior: { missing_payment_method: "pause" },
      },
    });

    res.status(200).json({
      success: true,
      message: "Trial subscribed successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = trialPeriodCheckout;
