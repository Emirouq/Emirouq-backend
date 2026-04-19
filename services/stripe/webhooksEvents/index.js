const SubscriptionPlan = require("../../../models/SubscriptionPlan.model");
const UserSubscription = require("../../../models/UserSubscription.model");
const User = require("../../../models/User.model");
const stripe = require("../getStripe");
const { v4: uuid } = require("uuid");
const dayjs = require("dayjs");
const Post = require("../../../models/Post.model");
const { getUtcUnixTimestamp } = require("../../util/dayjsHelperFunctions");
const {
  emitAdNotification,
} = require("../../notification/adNotifications");
const {
  notifyFavoriteItemUnavailable,
} = require("../../notification/favoriteNotifications");
const { NotificationEventType } = require("../../notification");
const {
  emitPaymentNotification,
  getUserByCustomerId,
} = require("../../notification/paymentNotifications");
const {
  addBoostExpiryReminderJob,
  addPackageRenewalReminderJob,
} = require("../../notification/jobs/lifecycleQueue");
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

  await emitPaymentNotification(user, NotificationEventType.PAYMENT_SUCCESSFUL, {
    contextId: invoice?.id,
    contextType: "payment",
    amount: invoice?.amount_paid / 100,
    currency: invoice?.currency,
    subscriptionId: subscription?.id,
    invoiceId: invoice?.id,
    packageName: plan?.name,
    planName: plan?.name,
  });

  await emitPaymentNotification(user, NotificationEventType.PACKAGE_ACTIVATED, {
    contextId: subscription?.id,
    contextType: "package",
    amount: plan?.amount,
    currency: plan?.currency,
    subscriptionId: subscription?.id,
    packageName: plan?.name,
    planName: plan?.name,
    endDate: subscription?.items?.data?.[0]?.current_period_end,
    data: {
      categoryId: plan?.categoryId,
    },
  });

  await addPackageRenewalReminderJob({
    userId: user.uuid,
    subscriptionId: subscription?.id,
    packageName: plan?.name,
    planName: plan?.name,
    endDate: subscription?.items?.data?.[0]?.current_period_end,
    categoryId: plan?.categoryId,
  });
};

const paymentIntent = async (data) => {
  console.log(data, "data");

  const user = await User.findOne({ customerId: data?.object?.customer });
  if (!user) {
    console.log("User not found");
    return;
  }
  const paymentIntent = await stripe.paymentIntents.retrieve(data?.object?.id);
  console.log(paymentIntent, "paymentIntent");

  await emitPaymentNotification(user, NotificationEventType.PAYMENT_SUCCESSFUL, {
    contextId: paymentIntent?.id,
    contextType: "payment",
    amount: paymentIntent?.amount / 100,
    currency: paymentIntent?.currency,
    paymentIntentId: paymentIntent?.id,
    data: {
      metadata: paymentIntent?.metadata,
    },
  });

  const post = await Post.findOne({
    uuid: data?.object?.metadata?.postId,
  });
  if (!post) {
    console.log("Post not found");
    return;
  }

  const updatedPost = await Post.findOneAndUpdate(
    {
      uuid: post.uuid,
    },
    {
      $set: {
        "featuredAd.isFeatured":
          data?.object?.metadata?.isFeaturedAd === "true",
        "featuredAd.price": paymentIntent?.amount / 100,
        "featuredAd.createdAt": getUtcUnixTimestamp(),
      },
    },
    { new: true }
  );

  if (updatedPost?.featuredAd?.isFeatured) {
    await emitAdNotification(updatedPost, NotificationEventType.AD_BOOSTED, {
      data: {
        amount: paymentIntent?.amount / 100,
        paymentIntentId: paymentIntent?.id,
      },
    });
    await addBoostExpiryReminderJob({
      postId: updatedPost.uuid,
      endDate: updatedPost.expirationDate,
    });
  }

  // also update the subscription plan used for featured ad boosts and increment the count , how many times the user has used the featured ad boosts
  await UserSubscription.findOneAndUpdate(
    {
      subscriptionId: post?.subscriptionId,
    },
    {
      $inc: {
        featuredAdBoostsUsed: 1,
      },
    }
  );
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

  const posts = await Post.find({ subscriptionId: subscription?.id });

  await Post.updateMany(
    {
      subscriptionId: subscription?.id,
    },
    {
      $set: {
        isExpired: true,
        "featuredAd.isFeatured": false,
        expirationDate: subscription?.items?.data?.[0]?.current_period_end,
      },
      $unset: {
        subscriptionId: "",
      },
    }
  );

  await Promise.all(
    posts.map((post) =>
      emitAdNotification(post, NotificationEventType.AD_EXPIRED, {
        data: {
          subscriptionId: subscription?.id,
        },
      })
    )
  );
  await Promise.all(
    posts.map((post) =>
      notifyFavoriteItemUnavailable(post, {
        data: {
          reason: "expired",
          subscriptionId: subscription?.id,
        },
      })
    )
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
const invoicePaymentFailed = async (data) => {
  const user = await getUserByCustomerId(data?.object?.customer);
  if (!user) {
    console.log("User not found");
    return;
  }

  const subscriptionId =
    data?.object?.parent?.subscription_details?.subscription ||
    data?.object?.subscription;

  await emitPaymentNotification(user, NotificationEventType.PAYMENT_FAILED, {
    contextId: data?.object?.id,
    contextType: "payment",
    amount: (data?.object?.amount_due || data?.object?.amount_remaining || 0) / 100,
    currency: data?.object?.currency,
    subscriptionId,
    invoiceId: data?.object?.id,
  });
};
const paymentIntentFailed = async (data) => {
  const paymentIntent = data?.object;
  const user = await getUserByCustomerId(paymentIntent?.customer);
  if (!user) {
    console.log("User not found");
    return;
  }

  await emitPaymentNotification(user, NotificationEventType.PAYMENT_FAILED, {
    contextId: paymentIntent?.id,
    contextType: "payment",
    amount: paymentIntent?.amount / 100,
    currency: paymentIntent?.currency,
    paymentIntentId: paymentIntent?.id,
    data: {
      metadata: paymentIntent?.metadata,
      lastPaymentError: paymentIntent?.last_payment_error?.message,
    },
  });
};
const refundUpdated = async (data) => {
  const stripeObject = data?.object;
  const refund =
    stripeObject?.object === "charge"
      ? stripeObject?.refunds?.data?.[0]
      : stripeObject;
  if (!refund) {
    console.log("Refund not found");
    return;
  }

  const paymentIntentId = refund?.payment_intent;
  let paymentIntent;

  if (paymentIntentId) {
    paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  }

  const user = await getUserByCustomerId(paymentIntent?.customer || refund?.customer);
  if (!user) {
    console.log("User not found");
    return;
  }

  const eventType =
    refund?.status === "succeeded"
      ? NotificationEventType.REFUND_COMPLETED
      : NotificationEventType.REFUND_INITIATED;

  await emitPaymentNotification(user, eventType, {
    contextId: refund?.id,
    contextType: "payment",
    amount: refund?.amount / 100,
    currency: refund?.currency,
    refundId: refund?.id,
    paymentIntentId,
    data: {
      refundStatus: refund?.status,
    },
  });
};
const customerSubscriptionDeleted = () => {};
const subscriptionScheduleCanceled = () => {};
const subscriptionScheduleAborted = () => {};
const customerSubscriptionCreated = () => {};
const customerSubscriptionUpdated = () => {};
const checkoutSessionCompleted = () => {};
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
  refundUpdated,
  customerSubscriptionTrialWillEnd,
  couponUpdated,
  couponDeleted,
  chargeSuccess,
  subscriptionCancelled,
  paymentIntent,
  paymentIntentFailed,
};
