const stripe = require("../../services/stripe/getStripe");

const checkSubscription = async (req, res, next) => {
  const { id } = req.params;
  try {
    const subscription = await stripe.subscriptions.retrieve(id);
    res.json({ status: subscription?.status, data: subscription });
  } catch (error) {
    next(error);
  }
};

module.exports = checkSubscription;
