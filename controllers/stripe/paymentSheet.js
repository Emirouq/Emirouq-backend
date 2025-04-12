const createHttpError = require("http-errors");
const UserSubscription = require("../../models/UserSubscription.model");
const SubscriptionPlan = require("../../models/SubscriptionPlan.model");
const stripe = require("../../services/stripe/getStripe");
const User = require("../../models/User.model");

const paymentSheet = async (req, res, next) => {
  try {
    const { uuid: user } = req.user;
    const { planId } = req.params;

    // Check if the user is a customer
    const { customerId } = await User.findOne(
      { uuid: user },
      { customerId: 1 }
    );
    if (!customerId) {
      throw createHttpError(404, "Customer not found");
    }
    const plan = await SubscriptionPlan.findOne({ uuid: planId });
    if (!plan) {
      throw createHttpError(404, "Plan not found");
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: plan?.amount * 100,
      currency: "aed",
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      paymentIntent: paymentIntent.client_secret,
      customer: customerId,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = paymentSheet;
