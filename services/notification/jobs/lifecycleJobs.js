const { runAdLifecycleNotificationScan } = require("../adLifecycleScanner");
const {
  runPaymentLifecycleNotificationScan,
} = require("../paymentLifecycleScanner");
const Post = require("../../../models/Post.model");
const {
  emitPaymentNotification,
  NotificationEventType,
} = require("../paymentNotifications");

const NOTIFICATION_LIFECYCLE_JOBS = {
  AD_LIFECYCLE_SCAN: "Ad Lifecycle Notification Scan",
  PAYMENT_LIFECYCLE_SCAN: "Payment Lifecycle Notification Scan",
  PACKAGE_RENEWAL_REMINDER: "Package Renewal Reminder",
  BOOST_EXPIRY_REMINDER: "Boost Expiry Reminder",
};

const processNotificationLifecycleJob = async (name, data = {}) => {
  switch (name) {
    case NOTIFICATION_LIFECYCLE_JOBS.AD_LIFECYCLE_SCAN:
      await runAdLifecycleNotificationScan();
      return;
    case NOTIFICATION_LIFECYCLE_JOBS.PAYMENT_LIFECYCLE_SCAN:
      await runPaymentLifecycleNotificationScan();
      return;
    case NOTIFICATION_LIFECYCLE_JOBS.PACKAGE_RENEWAL_REMINDER:
      await emitPaymentNotification(
        data.userId,
        NotificationEventType.RENEWAL_REMINDER,
        {
          contextId: data.subscriptionId,
          contextType: "package",
          subscriptionId: data.subscriptionId,
          packageName: data.packageName,
          planName: data.planName,
          endDate: data.endDate,
          data: {
            categoryId: data.categoryId,
          },
        }
      );
      return;
    case NOTIFICATION_LIFECYCLE_JOBS.BOOST_EXPIRY_REMINDER: {
      const post = await Post.findOne({ uuid: data.postId });
      if (!post) {
        return;
      }

      await emitPaymentNotification(
        post.userId,
        NotificationEventType.BOOST_PACKAGE_EXPIRED,
        {
          contextId: `${post.uuid}:boost:${data.endDate || ""}`,
          contextType: "boost",
          endDate: data.endDate,
          data: {
            postId: post.uuid,
            adTitle: post.title,
          },
        }
      );
      return;
    }
    default:
      throw new Error(`Unsupported notification lifecycle job: ${name}`);
  }
};

module.exports = {
  NOTIFICATION_LIFECYCLE_JOBS,
  processNotificationLifecycleJob,
};
