const stripe = require("./getStripe");
const User = require("../../models/User.model");
const { apiVersion } = require("../../config/keys").stripe;

/** The user's Stripe customer id, creating the customer the first time. */
const ensureCustomer = async (userId) => {
  const user = await User.findOne({ uuid: userId });
  if (!user) throw new Error("User not found");
  if (user.customerId) return { user, customerId: user.customerId };
  const customer = await stripe.customers.create({
    email: user.email,
    name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || undefined,
    metadata: { userId: user.uuid },
  });
  await User.updateOne({ uuid: user.uuid }, { $set: { customerId: customer.id } });
  return { user, customerId: customer.id };
};

/**
 * Everything the app's Stripe payment sheet needs. Apple Pay and Google Pay
 * are offered by the sheet itself for these intents (card wallets).
 */
const sheetParams = async ({ customerId, clientSecret, intentType = "payment" }) => {
  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customerId },
    { apiVersion }
  );
  return {
    customer: customerId,
    ephemeralKey: ephemeralKey.secret,
    clientSecret,
    intentType, // "payment" | "setup"
  };
};

module.exports = { ensureCustomer, sheetParams };
