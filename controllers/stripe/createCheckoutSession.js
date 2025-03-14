const createHttpError = require("http-errors");
const UserModel = require("../../models/User.model");
const stripe = require("../../services/stripe/getStripe");

const { liveRedirectUrl, testRedirectUrl } =
  require("../../config/keys").emailverifyKey;
const { tier1, tier2, testing, tradeLizerTesting } =
  require("../../config/keys").stripe.plans;

const { nodeEnv } = require("../../config/keys").environmental;
const createCheckoutSession = async (req, res, next) => {
  try {
    let { priceId } = req.body;
    const currentUser = req.user;
    if (![tier1, tier2, testing, tradeLizerTesting].includes(priceId))
      throw createHttpError.BadRequest(
        "Invalid pricing plan. Please contact administrator."
      );
    const existingUser = await UserModel.findOne({ uuid: currentUser?.uuid });
    if (!existingUser?.stripe?.customerId) {
      // create stripe customer
      const customer = await stripe.customers.create({
        email: existingUser.email,
        name: `${existingUser.firstName} ${existingUser.lastName}`,
      });
      existingUser.stripe = {
        customerId: customer.id,
      };
      await existingUser.save();
    }
    const url = nodeEnv === "test" ? testRedirectUrl : liveRedirectUrl;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: existingUser.stripe.customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: url,
      automatic_tax: {
        enabled: true,
      },
      customer_update: {
        address: "auto",
        shipping: "auto",
      },
      // cancel_url: process.env.CLIENT_URL,
    });
    res.status(200).json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = createCheckoutSession;
