const stripe = require("./getStripe");

const createCheckoutSession = async (priceId) => {
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `http://localhost:3000/dashboard`,
    // cancel_url: process.env.CLIENT_URL,
  });

  return session.url;
};

module.exports = createCheckoutSession;
