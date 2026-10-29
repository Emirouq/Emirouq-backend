const SubscriptionPlan = require("../../../models/SubscriptionPlan.model");
const UserSubscription = require("../../../models/UserSubscription.model");
const User = require("../../../models/User.model");
const stripe = require("../getStripe");
const { boostPrice } = require("../../../config/keys").stripe;
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
const {
  recordInvoiceTransaction,
  recordPaymentIntentTransaction,
  recordRefund,
} = require("../recordTransaction");
const invoicePaid = async (data) => {
  console.log(data, "data");

  // getUserByCustomerId returns null for a missing id. A bare
  // findOne({ customerId: undefined }) would match the FIRST user.
  const user = await getUserByCustomerId(data?.object?.customer);
  if (!user) {
    console.log("User not found");
    return;
  }
  const stripeSubscriptionId =
    data?.object?.parent?.subscription_details?.subscription ||
    data?.object?.subscription;
  if (!stripeSubscriptionId) {
    console.log("Invoice is not for a subscription");
    return;
  }
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  if (!subscription) {
    console.log("Subscription not found");
    return;
  }
  // The plan comes from our metadata, or else from the Stripe price itself.
  // Never query with empty values: Mongoose drops undefined filters, which
  // would match whatever plan happens to be first.
  const metadata = data?.object?.parent?.subscription_details?.metadata || {};
  const priceId = metadata.priceId || subscription?.items?.data?.[0]?.price?.id;
  if (!priceId) {
    console.log("Price not found");
    return;
  }
  const plan = await SubscriptionPlan.findOne({
    priceId,
    ...(metadata.categoryId && { categoryId: metadata.categoryId }),
  });
  if (!plan) {
    console.log("Plan not found");
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

  // invoice.paid fires on the first payment AND on every renewal. It used to
  // create a new UserSubscription each time; a renewal now extends the
  // existing row instead.
  const periodStart = subscription?.items?.data?.[0]?.current_period_start;
  const periodEnd = subscription?.items?.data?.[0]?.current_period_end;
  const existingSubscription = await UserSubscription.findOne({
    subscriptionId: subscription?.id,
  });
  if (existingSubscription) {
    const isNewPeriod =
      Number(periodEnd) > Number(existingSubscription.endDate || 0);
    await UserSubscription.updateOne(
      { uuid: existingSubscription.uuid },
      {
        $set: {
          startDate: periodStart,
          endDate: periodEnd,
          status: "active",
          defaultPaymentMethod: subscription?.default_payment_method,
        },
        ...(isNewPeriod && { $inc: { renew_count: 1 } }),
      }
    );
    await recordInvoiceTransaction({
      invoiceId: invoice?.id,
      user,
      plan,
      userSubscriptionId: existingSubscription.uuid,
      status: "succeeded",
    });
    return;
  }

  const userSubscriptionId = uuid();
  await UserSubscription.create({
    uuid: userSubscriptionId,
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

  await recordInvoiceTransaction({
    invoiceId: invoice?.id,
    user,
    plan,
    userSubscriptionId,
    status: "succeeded",
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

/** Is this payment intent one of our one-off ad boost payments? */
const isBoostIntent = (intent) =>
  intent?.metadata?.purpose === "boost" ||
  // Payment sheets created by older app versions.
  intent?.metadata?.isFeaturedAd === "true";

/**
 * payment_intent.succeeded: activates a paid boost.
 *
 * Everything is re-read from Stripe and checked on the server: the intent
 * really succeeded, it is a boost we created, it paid at least the boost
 * price, and this intent has not been applied before. Subscription payments
 * are handled by invoice.paid.
 */
const paymentIntent = async (data) => {
  const intent = await stripe.paymentIntents.retrieve(data?.object?.id);
  if (!isBoostIntent(intent)) return;
  const user = await User.findOne({ customerId: intent?.customer });
  if (!user) {
    console.log("User not found");
    return;
  }
  if (intent.status !== "succeeded") return;

  await recordPaymentIntentTransaction({
    paymentIntentId: intent.id,
    user,
    status: "succeeded",
  });

  const minimum = Math.round(boostPrice * 100);
  const postId = intent.metadata?.postId;
  // No id = nothing to boost (a bare findOne would return the first ad).
  const post = postId ? await Post.findOne({ uuid: postId }) : null;
  if (!post || intent.amount_received < minimum) {
    // Paid, but nothing valid to boost (ad deleted, or an old app paid a
    // tampered amount). Recorded above so an admin can refund it.
    console.warn(
      `Boost payment ${intent.id} not applied: ${!post ? "post missing" : "amount below price"}`
    );
    return;
  }

  // Applies once: the filter skips posts this intent already boosted.
  const updatedPost = await Post.findOneAndUpdate(
    { uuid: post.uuid, "featuredAd.paymentIntentId": { $ne: intent.id } },
    {
      $set: {
        "featuredAd.isFeatured": true,
        "featuredAd.price": intent.amount_received / 100,
        "featuredAd.createdAt": getUtcUnixTimestamp(),
        "featuredAd.paymentIntentId": intent.id,
      },
      $unset: { "featuredAd.pendingPaymentIntentId": "" },
    },
    { new: true }
  );
  if (!updatedPost) return; // already applied by an earlier delivery

  await emitPaymentNotification(user, NotificationEventType.PAYMENT_SUCCESSFUL, {
    contextId: intent.id,
    contextType: "payment",
    amount: intent.amount_received / 100,
    currency: intent.currency,
    paymentIntentId: intent.id,
    data: { postId: post.uuid, purpose: "boost" },
  });
  await emitAdNotification(updatedPost, NotificationEventType.AD_BOOSTED, {
    data: {
      amount: intent.amount_received / 100,
      paymentIntentId: intent.id,
    },
  });
  await addBoostExpiryReminderJob({
    postId: updatedPost.uuid,
    endDate: updatedPost.expirationDate,
  });
};

/** payment_intent.processing / .canceled for boosts: record, never activate. */
const paymentIntentPendingOrCanceled = async (data, status) => {
  const intent = data?.object;
  if (!isBoostIntent(intent)) return;
  const user = await getUserByCustomerId(intent?.customer);
  if (!user) return;
  await recordPaymentIntentTransaction({ paymentIntentId: intent.id, user, status });
};
const subscriptionCancelled = async (data) => {
  const user = await getUserByCustomerId(data?.object?.customer);
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
        // "canceled" (one l) is what the UserSubscription enum allows.
        // findOneAndUpdate skips validators, so "cancelled" used to be written
        // straight through and never matched a status comparison.
        status: "canceled",
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

  const failedPriceId = data?.object?.parent?.subscription_details?.metadata?.priceId;
  const failedPlan = failedPriceId
    ? await SubscriptionPlan.findOne({ priceId: failedPriceId }).lean()
    : null;
  const ownSubscription = subscriptionId
    ? await UserSubscription.findOne({ subscriptionId }).lean()
    : null;
  await recordInvoiceTransaction({
    invoiceId: data?.object?.id,
    user,
    plan: failedPlan || undefined,
    userSubscriptionId: ownSubscription?.uuid,
    status: "failed",
  });

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

  // Subscription invoices are recorded by invoice.payment_failed; only
  // one-off payments (ad boosts) are recorded here.
  if (isBoostIntent(paymentIntent)) {
    await recordPaymentIntentTransaction({
      paymentIntentId: paymentIntent?.id,
      user,
      status: "failed",
    });
  } else {
    // Subscription payments are reported by invoice.payment_failed.
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

  const refundedTransaction = await recordRefund(refund);
  // A fully refunded boost is switched off; subscriptions are handled by the
  // admin refund action (which can cancel the plan).
  if (
    refundedTransaction?.type === "boost" &&
    refundedTransaction.status === "refunded" &&
    refundedTransaction.postId
  ) {
    await Post.updateOne(
      {
        uuid: refundedTransaction.postId,
        "featuredAd.paymentIntentId": refundedTransaction.paymentIntentId,
      },
      { $set: { "featuredAd.isFeatured": false } }
    );
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
  paymentIntentPendingOrCanceled,
  isBoostIntent,
};
