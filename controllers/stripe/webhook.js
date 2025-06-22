const stripe = require("../../services/stripe/getStripe");
const UserModel = require("../../models/User.model");
const Transaction = require("../../models/Transaction.model");
const dayjs = require("dayjs");
const { v4: uuid } = require("uuid");
const {
  invoicePaid,
  chargeSuccess,
  customerSubscriptionUpdated,
  subscriptionCancelled,
} = require("../../services/stripe/webhooksEvents");
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
  // if (!data?.object?.parent?.subscription_details?.subscription) {
  //   console.log("No subscription found in the event data");
  //   return res.sendStatus(200);
  // }
  // const subscription = await stripe.subscriptions.retrieve(
  //   data?.object?.parent?.subscription_details?.subscription
  // );
  // if (!subscription) {
  //   console.log("No subscription found for the given ID");
  //   return res.sendStatus(200);
  // }

  switch (eventType) {
    case "customer.subscription.deleted":
      break;
    case "subscription_schedule.canceled":
      subscriptionCancelled(data);
      break;
    case "subscription_schedule.aborted":
      break;
    case "customer.subscription.created":
      break;
    case "customer.subscription.updated":
      customerSubscriptionUpdated(data);
      break;
    case "checkout.session.completed":
      break;
    case "charge.succeeded":
      chargeSuccess(data);
      break;
    case "invoice.paid":
      invoicePaid(data);
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
