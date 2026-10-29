const httpErrors = require("http-errors");
const stripe = require("../../services/stripe/getStripe");
const User = require("../../models/User.model");
const Post = require("../../models/Post.model");
const UserSubscription = require("../../models/UserSubscription.model");

/**
 * GET /api/payments/status?paymentIntentId=… | ?subscriptionId=…
 * What the server knows about a payment, checked with Stripe. The app shows
 * "success" only once `activated` is true, i.e. after the webhook verified
 * the payment and switched the feature on.
 */
const paymentStatus = async (req, res, next) => {
  try {
    const { paymentIntentId, subscriptionId } = req.query;
    const user = await User.findOne({ uuid: req.user.uuid }).select("customerId").lean();
    if (!user?.customerId) throw httpErrors.NotFound("Payment not found");

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId).catch(() => null);
      if (!subscription || subscription.customer !== user.customerId) {
        throw httpErrors.NotFound("Payment not found");
      }
      const active = await UserSubscription.exists({
        subscriptionId,
        user: req.user.uuid,
        status: "active",
      });
      return res.json({
        data: {
          kind: "subscription",
          // incomplete = waiting for payment, active = paid
          status: subscription.status,
          activated: !!active,
        },
      });
    }

    if (!paymentIntentId) throw httpErrors.BadRequest("paymentIntentId or subscriptionId required");
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId).catch(() => null);
    if (!intent || intent.customer !== user.customerId) {
      throw httpErrors.NotFound("Payment not found");
    }
    let activated = false;
    if (intent.metadata?.purpose === "boost" || intent.metadata?.isFeaturedAd === "true") {
      activated = !!(await Post.exists({
        uuid: intent.metadata.postId,
        "featuredAd.paymentIntentId": intent.id,
        "featuredAd.isFeatured": true,
      }));
    }
    res.json({
      data: {
        kind: intent.metadata?.purpose || "payment",
        // succeeded | processing | requires_payment_method | canceled …
        status: intent.status,
        activated,
        failureMessage: intent.last_payment_error?.message,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = paymentStatus;
