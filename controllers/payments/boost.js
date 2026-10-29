const httpErrors = require("http-errors");
const stripe = require("../../services/stripe/getStripe");
const Post = require("../../models/Post.model");
const { boostPrice, currency } = require("../../config/keys").stripe;
const { ensureCustomer, sheetParams } = require("../../services/stripe/checkout");

const REUSABLE_STATUSES = ["requires_payment_method", "requires_confirmation", "requires_action"];

/** The ad, if this user may boost it now. */
const boostablePost = async (postId, userId) => {
  const post = await Post.findOne({ uuid: postId });
  if (!post) throw httpErrors.NotFound("Ad not found");
  if (post.userId !== userId) throw httpErrors.Forbidden("You can only boost your own ads.");
  if (post.status !== "active" || post.isExpired) {
    throw httpErrors.BadRequest("Only live ads can be boosted.");
  }
  if (post.featuredAd?.isFeatured) {
    throw httpErrors.Conflict("This ad is already boosted.");
  }
  return post;
};

/** GET /api/payments/boost/:postId/quote: the price, from the server. */
const boostQuote = async (req, res, next) => {
  try {
    await boostablePost(req.params.postId, req.user.uuid);
    res.json({
      data: {
        amount: boostPrice,
        currency,
        description: "Featured ad: shown in Featured listings until the ad expires.",
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/boost/:postId
 * A payment intent for the boost. Price and metadata are set here, never by
 * the app. A checkout already started for this ad is reused, so a double tap
 * or retry cannot charge twice.
 */
const createBoostPayment = async (req, res, next) => {
  try {
    const post = await boostablePost(req.params.postId, req.user.uuid);
    const { customerId } = await ensureCustomer(req.user.uuid);
    const amount = Math.round(boostPrice * 100);

    let intent = null;
    if (post.featuredAd?.pendingPaymentIntentId) {
      const existing = await stripe.paymentIntents
        .retrieve(post.featuredAd.pendingPaymentIntentId)
        .catch(() => null);
      if (existing?.status === "succeeded" || existing?.status === "processing") {
        throw httpErrors.Conflict(
          "A payment for this boost is already being processed. It will show shortly."
        );
      }
      if (
        existing &&
        REUSABLE_STATUSES.includes(existing.status) &&
        existing.amount === amount &&
        existing.customer === customerId
      ) {
        intent = existing;
      }
    }

    if (!intent) {
      intent = await stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        automatic_payment_methods: { enabled: true },
        description: `Featured ad boost: ${post.title || post.uuid}`.slice(0, 200),
        metadata: { purpose: "boost", postId: post.uuid, userId: req.user.uuid },
      });
      await Post.updateOne(
        { uuid: post.uuid },
        { $set: { "featuredAd.pendingPaymentIntentId": intent.id } }
      );
    }

    res.json({
      data: {
        ...(await sheetParams({ customerId, clientSecret: intent.client_secret })),
        paymentIntentId: intent.id,
        amount: intent.amount / 100,
        currency: intent.currency,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { boostQuote, createBoostPayment };
