const createHttpError = require("http-errors");
const UserSubscription = require("../../models/UserSubscription.model");
const SubscriptionPlan = require("../../models/SubscriptionPlan.model");
const stripe = require("../../services/stripe/getStripe");
const User = require("../../models/User.model");
const Post = require("../../models/Post.model");
const { boostPrice } = require("../../config/keys").stripe;
const { assertCategoryOpen } = require("../../helpers/categoryAvailability");

const paymentSheet = async (req, res, next) => {
  try {
    const { uuid: user } = req.user;
    const { planId } = req.params;
    const { metadata } = req.body;

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
    // Buying a plan needs an enabled category. Boosting an ad that is still
    // live (metadata.isFeaturedAd) is allowed.
    if (!metadata?.isFeaturedAd) {
      await assertCategoryOpen(plan.categoryId);
    }

    // Older app versions call this for boosts and used to send the amount
    // and the metadata themselves, so a modified app could pay any price.
    // The server now sets both; the app's `amount` is ignored.
    const isBoost = !!metadata?.isFeaturedAd;
    let safeMetadata = {};
    if (isBoost) {
      const post = metadata?.postId
        ? await Post.findOne({ uuid: metadata.postId }).lean()
        : null;
      if (!post || post.userId !== user) {
        throw createHttpError(403, "You can only boost your own ads.");
      }
      safeMetadata = { purpose: "boost", postId: post.uuid, userId: user };
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round((isBoost ? boostPrice : plan.amount) * 100),
      currency: "aed",
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: safeMetadata,
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
