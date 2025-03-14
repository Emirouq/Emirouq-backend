const dayjs = require("dayjs");
const UserModel = require("../../models/User.model");
const AccountModel = require("../../models/Account.model");
const stripe = require("../../services/stripe/getStripe");

const { liveRedirectUrl, testRedirectUrl } =
  require("../../config/keys").emailverifyKey;
const { tier1, tier2, usdTier2, usdTier1 } =
  require("../../config/keys").stripe.plans;

const { nodeEnv } = require("../../config/keys").environmental;
const changeSubscription = async (req, res, next) => {
  try {
    let { priceId, customerId, subscriptionId, accountList } = req.body;
    const currentUser = req.user;
    const existingUser = await UserModel.findOne({ uuid: currentUser?.uuid });
    if (!existingUser) {
      throw new Error("User not found");
    }
    const url = nodeEnv === "test" ? testRedirectUrl : liveRedirectUrl;

    const activeAccountId = accountList?.find(
      (account) => account.status === "active"
    )?.uuid;
    const inactiveAccountIds = accountList
      ?.filter((account) => account.status === "inactive")
      ?.map((account) => account.uuid);
    const proration_date = Math.floor(Date.now() / 1000);

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription?.items?.data?.[0]?.id,
          price: priceId,
        },
      ],
      // proration_date: proration_date,
      // billing_cycle_anchor: "now",
      // proration_behavior: "create_prorations",
    });

    // Create a Checkout session with the updated subscription
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: url,
      subscription_data: {
        metadata: {
          activeAccountId,
          inactiveAccountIds: JSON.stringify(inactiveAccountIds),
        },
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

module.exports = changeSubscription;
