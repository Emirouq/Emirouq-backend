const createHttpError = require("http-errors");
const SubscriptionPlan = require("../../models/SubscriptionPlan.model");
const stripe = require("../../services/stripe/getStripe");
const User = require("../../models/User.model");

const createSubscription = async (req, res, next) => {
  const { uuid: user } = req.user;
  const { priceId, categoryId } = req.body;

  // Check if the user is a customer
  const { customerId } = await User.findOne({ uuid: user }, { customerId: 1 });
  if (!customerId) {
    throw createHttpError(404, "Customer not found");
  }
  //check if the subscription plan with the given priceId and categoryId exists
  const plan = await SubscriptionPlan.findOne({ priceId, categoryId });
  // if (!plan) {
  //   throw createHttpError(404, "Plan not found");
  // }

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
      expand: ["latest_invoice.confirmation_secret", "pending_setup_intent"],
      metadata: {
        priceId,
        categoryId,
      },
      cancel_at_period_end: true,
    });

    if (subscription.pending_setup_intent !== null) {
      res.send({
        subscriptionId: subscription.id,
        clientSecret: subscription.pending_setup_intent.client_secret,
      });
    } else {
      res.send({
        subscriptionId: subscription.id,
        clientSecret:
          subscription.latest_invoice.confirmation_secret.client_secret,
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = createSubscription;
