const createHttpError = require("http-errors");
const SubscriptionPlan = require("../../models/SubscriptionPlan.model");
const stripe = require("../../services/stripe/getStripe");
const User = require("../../models/User.model");
const Post = require("../../models/Post.model");

const createSubscriptionForFeatureAd = async (req, res, next) => {
  const { uuid: user } = req.user;
  const { postId } = req.params;
  const { amount } = req.body;

  // Check if the user is a customer
  const { customerId } = await User.findOne({ uuid: user }, { customerId: 1 });
  if (!customerId) {
    throw createHttpError(404, "Customer not found");
  }
  //check if the subscription plan with the given priceId and categoryId exists
  const post = await Post.findOne({ uuid: postId });
  if (!post) {
    throw createHttpError(404, "Post not found");
  }

  try {
    // Create the subscription. Note we're expanding the Subscription's
    // latest invoice and that invoice's confirmation_secret
    // so we can pass it to the front end to confirm the payment
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: amount,
          quantity: 1, // Assuming you want to create a subscription for one post
        },
      ],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.confirmation_secret", "pending_setup_intent"],
      metadata: {
        featuredAd: true, // Indicating this is a featured ad subscription,
        postId, // Linking the subscription to the specific post
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

module.exports = createSubscriptionForFeatureAd;
