const createHttpError = require("http-errors");
const UserSubscription = require("../../models/UserSubscription.model");
const SubscriptionPlan = require("../../models/SubscriptionPlan.model");
const stripe = require("../../services/stripe/getStripe");
const User = require("../../models/User.model");
const { cancel } = require("agenda/dist/agenda/cancel");

const createSubscription = async (req, res, next) => {
  const { uuid: user } = req.user;
  const { priceId } = req.body;

  // Check if the user is a customer
  const { customerId } = await User.findOne({ uuid: user }, { customerId: 1 });
  if (!customerId) {
    throw createHttpError(404, "Customer not found");
  }
  const plan = await SubscriptionPlan.findOne({ priceId });
  if (!plan) {
    throw createHttpError(404, "Plan not found");
  }

  try {
    // Create the subscription. Note we're expanding the Subscription's
    // latest invoice and that invoice's confirmation_secret
    // so we can pass it to the front end to confirm the payment
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: priceId,
        },
      ],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.confirmation_secret"],
      metadata: {
        priceId,
      },
      cancel_at_period_end: true,
    });

    res.send({
      subscriptionId: subscription.id,
      clientSecret:
        subscription.latest_invoice.confirmation_secret.client_secret,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = createSubscription;
