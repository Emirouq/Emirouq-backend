const Post = require("../../models/Post.model");
const UserSubscription = require("../../models/UserSubscription.model");
const {
  emitPaymentNotification,
  notificationExists,
  NotificationEventType,
} = require("./paymentNotifications");

const ONE_DAY_SECONDS = 24 * 60 * 60;
const TWO_DAYS_SECONDS = 2 * ONE_DAY_SECONDS;

const notifyRenewalsDueSoon = async () => {
  const now = Math.floor(Date.now() / 1000);
  const windowEnd = now + TWO_DAYS_SECONDS;

  const subscriptions = await UserSubscription.find({
    status: "active",
    endDate: {
      $gt: now,
      $lte: windowEnd,
    },
  });

  for (const subscription of subscriptions) {
    const alreadyNotified = await notificationExists({
      receiver: subscription.user,
      eventType: NotificationEventType.RENEWAL_REMINDER,
      contextId: subscription.subscriptionId,
      endDate: subscription.endDate,
    });

    if (!alreadyNotified) {
      await emitPaymentNotification(
        subscription.user,
        NotificationEventType.RENEWAL_REMINDER,
        {
          contextId: subscription.subscriptionId,
          subscriptionId: subscription.subscriptionId,
          contextType: "package",
          packageName: subscription.subscriptionPlan?.name,
          planName: subscription.subscriptionPlan?.name,
          endDate: subscription.endDate,
          data: {
            categoryId: subscription.subscriptionPlan?.categoryId,
          },
        }
      );
    }
  }
};

const notifyBoostsExpiringSoon = async () => {
  const now = Math.floor(Date.now() / 1000);
  const windowEnd = now + TWO_DAYS_SECONDS;

  const posts = await Post.find({
    "featuredAd.isFeatured": true,
    "featuredAd.createdAt": { $exists: true },
    expirationDate: {
      $gt: now,
      $lte: windowEnd,
    },
  });

  for (const post of posts) {
    const contextId = `${post.uuid}:boost:${post.expirationDate || ""}`;
    const alreadyNotified = await notificationExists({
      receiver: post.userId,
      eventType: NotificationEventType.BOOST_PACKAGE_EXPIRED,
      contextId,
    });

    if (!alreadyNotified) {
      await emitPaymentNotification(
        post.userId,
        NotificationEventType.BOOST_PACKAGE_EXPIRED,
        {
          contextId,
          contextType: "boost",
          endDate: post.expirationDate,
          data: {
            postId: post.uuid,
            adTitle: post.title,
          },
        }
      );
    }
  }
};

const runPaymentLifecycleNotificationScan = async () => {
  await notifyRenewalsDueSoon();
  await notifyBoostsExpiringSoon();
};

module.exports = {
  runPaymentLifecycleNotificationScan,
};
