const stripe = require("../../services/stripe/getStripe");
const UserModel = require("../../models/User.model");
const Transaction = require("../../models/Transaction.model");
const dayjs = require("dayjs");
const { v4: uuid } = require("uuid");

const webhook = async (req, res) => {
  let data;
  // making a user variable here because individual switch cases do not have block scopes
  let user;
  let eventType;

  data = req.body.data;
  eventType = req.body.type;

  console.log(
    "*************** webhook event type: ",
    eventType,
    " ***************"
  );

  switch (eventType) {
    case "customer.subscription.deleted":
      break;
    case "subscription_schedule.canceled":
      break;
    case "subscription_schedule.aborted":
      break;
    case "customer.subscription.created":
      break;
    case "customer.subscription.updated":
      break;
    case "checkout.session.completed":
      break;
    case "invoice.paid":
      break;
    case "invoice.payment_failed":
      break;
    case "customer.subscription.trial_will_end":
      break;
    case "coupon.updated":
      break;

    case "coupon.deleted":
      break;

    case "coupon.updated":
      break;

    default:
  }

  res.sendStatus(200);
};

module.exports = webhook;
