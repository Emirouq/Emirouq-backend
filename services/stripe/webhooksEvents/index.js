const SubscriptionPlan = require("../../../models/SubscriptionPlan.model");
const UserSubscription = require("../../../models/UserSubscription.model");
const User = require("../../../models/User.model");
const stripe = require("../getStripe");
const { v4: uuid } = require("uuid");
const dayjs = require("dayjs");
const Post = require("../../../models/Post.model");
const invoicePaid = async (data) => {
  console.log(data, "data");

  const user = await User.findOne({ customerId: data?.object?.customer });
  if (!user) {
    console.log("User not found");
    return;
  }
  const priceId = data?.object?.parent?.subscription_details?.metadata?.priceId;
  const categoryId =
    data?.object?.parent?.subscription_details?.metadata?.categoryId;
  const plan = await SubscriptionPlan.findOne({ priceId, categoryId });
  if (!plan) {
    console.log("Plan not found");
    return;
  }
  const subscription = await stripe.subscriptions.retrieve(
    data?.object?.parent?.subscription_details?.subscription
  );
  if (!subscription) {
    console.log("Subscription not found");
    return;
  }

  const invoiceId = data?.object?.lines?.data?.[0]?.invoice; // Invoice ID

  // Fetch the invoice using the ID
  const invoice = await stripe.invoices.retrieve(invoiceId);
  const invoiceObject = {
    invoiceId: invoice?.id,
    invoicePdf: invoice?.invoice_pdf,
    hostedUrl: invoice?.hosted_invoice_url,
    invoiceDate: dayjs.unix(invoice?.created).format("MMMM DD, YYYY"),
    invoiceAmount: invoice?.amount_paid / 100,
    discount: invoice?.discounts,
    invoiceNumber: invoice?.number,
    total: invoice?.total / 100,
    subtotal: invoice?.subtotal / 100,
    tax: invoice?.tax / 100,
    invoiceNumber: invoice?.number,
    defaultPaymentMethod: invoice?.charge?.payment_method,
    fingerPrint: invoice?.charge?.payment_method_details?.card?.fingerprint,
    charge: invoice?.charge?.id,
  };

  await UserSubscription.create({
    uuid: uuid(),
    user: user.uuid,
    customerId: user?.customerId,
    subscriptionId: subscription?.id,
    subscriptionPlan: {
      planId: plan.uuid,
      name: plan?.name,
      amount: plan?.amount,
      currency: plan?.currency,
      interval: plan?.interval,
      interval_count: plan?.interval_count,
      duration: plan?.duration,
      numberOfAds: plan?.numberOfAds,
      featuredAdBoosts: plan?.featuredAdBoosts,
      isVerifiedBadge: plan?.isVerifiedBadge,
      prioritySupport: plan?.prioritySupport,
      premiumSupport: plan?.premiumSupport,
      categoryId: plan?.categoryId,
    },
    startDate: subscription?.items?.data?.[0]?.current_period_start,
    endDate: subscription?.items?.data?.[0]?.current_period_end,
    status: "active",
    fingerPrint: invoiceObject?.fingerPrint,
    defaultPaymentMethod: subscription?.default_payment_method,
  });
};
const subscriptionCancelled = async (data) => {
  const user = await User.findOne({ customerId: data?.object?.customer });
  if (!user) {
    console.log("User not found");
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(
    data?.object?.parent?.subscription_details?.subscription
  );
  if (!subscription) {
    console.log("Subscription not found");
    return;
  }
  await UserSubscription.findOneAndUpdate(
    {
      subscriptionId: subscription?.id,
    },
    {
      $set: {
        status: "cancelled",
        endDate: subscription?.items?.data?.[0]?.current_period_end,
      },
    }
  );

  await Post.updateMany(
    {
      subscriptionId: subscription?.id,
    },
    {
      $set: {
        isExpired: true,
      },
    }
  );
  // await UserSubscription.create({
  //   uuid: uuid(),
  //   user: user.uuid,
  //   customerId: user?.customerId,
  //   subscriptionId: subscription?.id,
  //   subscriptionPlan: {
  //     planId: plan.uuid,
  //     name: plan?.name,
  //     amount: plan?.amount,
  //     currency: plan?.currency,
  //     interval: plan?.interval,
  //     interval_count: plan?.interval_count,
  //     duration: plan?.duration,
  //     numberOfAds: plan?.numberOfAds,
  //     featuredAdBoosts: plan?.featuredAdBoosts,
  //     isVerifiedBadge: plan?.isVerifiedBadge,
  //     prioritySupport: plan?.prioritySupport,
  //     premiumSupport: plan?.premiumSupport,
  //     categoryId: plan?.categoryId,
  //   },
  //   startDate: subscription?.items?.data?.[0]?.current_period_start,
  //   endDate: subscription?.items?.data?.[0]?.current_period_end,
  //   status: "active",
  //   fingerPrint: invoiceObject?.fingerPrint,
  //   defaultPaymentMethod: subscription?.default_payment_method,
  // });
};
const chargeSuccess = async (data) => {
  // const user = await User.findOne({ customerId: data?.object?.customer });
  // if (!user) {
  //   console.log("User not found");
  //   return;
  // }
  // const charge = await stripe.charges.retrieve(data?.object?.id);
  // if (!charge) {
  //   console.log("Charge not found");
  //   return;
  // }
  // await UserSubscription.findOneAndUpdate(
  //   {
  //     subscriptionId: charge?.invoice?.subscription,
  //   },
  //   {
  //     $set: {
  //       fingerPrint: charge?.payment_method_details?.card?.fingerprint,
  //       defaultPaymentMethod: charge?.payment_method,
  //     },
  //     $addToSet: {
  //       usedFingerPrints: charge?.payment_method_details?.card?.fingerprint,
  //     },
  //   }
  // );
};
const customerSubscriptionDeleted = () => {};
const subscriptionScheduleCanceled = () => {};
const subscriptionScheduleAborted = () => {};
const customerSubscriptionCreated = () => {};
const customerSubscriptionUpdated = () => {};
const checkoutSessionCompleted = () => {};
const invoicePaymentFailed = () => {};
const customerSubscriptionTrialWillEnd = () => {};
const couponUpdated = () => {};
const couponDeleted = () => {};

module.exports = {
  invoicePaid,
  customerSubscriptionDeleted,
  subscriptionScheduleCanceled,
  subscriptionScheduleAborted,
  customerSubscriptionCreated,
  customerSubscriptionUpdated,
  checkoutSessionCompleted,
  invoicePaymentFailed,
  customerSubscriptionTrialWillEnd,
  couponUpdated,
  couponDeleted,
  chargeSuccess,
  subscriptionCancelled,
};
