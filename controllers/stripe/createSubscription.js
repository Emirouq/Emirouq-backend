const createHttpError = require("http-errors");
const SubscriptionPlan = require("../../models/SubscriptionPlan.model");
const stripe = require("../../services/stripe/getStripe");
const User = require("../../models/User.model");
const { assertCategoryOpen } = require("../../helpers/categoryAvailability");
const { ensureCustomer, sheetParams } = require("../../services/stripe/checkout");

const createSubscription = async (req, res, next) => {
  const { uuid: user } = req.user;
  const { priceId, categoryId } = req.body;

  try {
    // These checks used to run outside the try, so a missing customer or
    // plan left the request hanging instead of answering with an error.
    const { customerId } = await ensureCustomer(user);
    //check if the subscription plan with the given priceId and categoryId exists
    const plan = await SubscriptionPlan.findOne({ priceId, categoryId });
    if (!plan) {
      throw createHttpError(404, "Plan not found");
    }
    // No new plans for a disabled category.
    await assertCategoryOpen(plan.categoryId);

    // A checkout for this plan started in the last 30 minutes and not paid
    // yet is reused, so a double tap or a retry cannot create two charges.
    const recent = await stripe.subscriptions.list({
      customer: customerId,
      price: priceId,
      status: "incomplete",
      created: { gte: Math.floor(Date.now() / 1000) - 30 * 60 },
      limit: 1,
      expand: ["data.latest_invoice.confirmation_secret", "data.pending_setup_intent"],
    });

    // Otherwise create the subscription, expanding the first invoice's
    // confirmation secret for the app's payment sheet.
    const subscription =
      recent.data[0] ||
      (await stripe.subscriptions.create({
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
      }));

    const isSetup = !!subscription.pending_setup_intent;
    const clientSecret = isSetup
      ? subscription.pending_setup_intent.client_secret
      : subscription.latest_invoice?.confirmation_secret?.client_secret;
    if (!clientSecret) throw createHttpError(502, "Could not start the payment. Try again.");

    res.send({
      subscriptionId: subscription.id,
      clientSecret,
      // The amount the user is about to pay, from Stripe (shown before paying).
      amount: (subscription.latest_invoice?.amount_due ?? plan.amount * 100) / 100,
      currency: subscription.latest_invoice?.currency || plan.currency,
      ...(await sheetParams({
        customerId,
        clientSecret,
        intentType: isSetup ? "setup" : "payment",
      })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = createSubscription;
