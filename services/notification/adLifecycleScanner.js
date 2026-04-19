const Post = require("../../models/Post.model");
const Notification = require("../../models/Notification.model");
const { emitAdNotification } = require("./adNotifications");
const {
  notifyFavoriteItemUnavailable,
} = require("./favoriteNotifications");
const { NotificationEventType } = require("./index");

const ONE_DAY_SECONDS = 24 * 60 * 60;

const notificationExists = async (postId, eventType, expirationDate) =>
  Notification.exists({
    contextId: postId,
    eventType,
    ...(expirationDate ? { "data.expirationDate": expirationDate } : {}),
  });

const notifyExpiringSoonAds = async () => {
  const now = Math.floor(Date.now() / 1000);
  const windowEnd = now + ONE_DAY_SECONDS;

  const posts = await Post.find({
    status: "active",
    isExpired: false,
    expirationDate: {
      $gt: now,
      $lte: windowEnd,
    },
  });

  for (const post of posts) {
    const alreadyNotified = await notificationExists(
      post.uuid,
      NotificationEventType.AD_EXPIRING_SOON,
      post.expirationDate,
    );
    if (!alreadyNotified) {
      await emitAdNotification(post, NotificationEventType.AD_EXPIRING_SOON, {
        data: {
          expirationDate: post.expirationDate,
        },
      });
    }
  }
};

const expireAdsPastDue = async () => {
  const now = Math.floor(Date.now() / 1000);

  const posts = await Post.find({
    status: { $nin: ["expired", "draft", "rejected", "removed"] },
    isExpired: false,
    expirationDate: {
      $lte: now,
    },
  });

  for (const post of posts) {
    post.status = "expired";
    post.isExpired = true;
    await post.save();

    const alreadyNotified = await notificationExists(
      post.uuid,
      NotificationEventType.AD_EXPIRED,
      post.expirationDate,
    );
    if (!alreadyNotified) {
      await emitAdNotification(post, NotificationEventType.AD_EXPIRED, {
        data: {
          expirationDate: post.expirationDate,
        },
      });
    }
    await notifyFavoriteItemUnavailable(post, {
      data: {
        reason: "expired",
        expirationDate: post.expirationDate,
      },
    });
  }
};

const runAdLifecycleNotificationScan = async () => {
  await notifyExpiringSoonAds();
  await expireAdsPastDue();
};

module.exports = {
  runAdLifecycleNotificationScan,
};
