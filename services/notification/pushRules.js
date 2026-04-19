const { PushNotificationEventType } = require("./eventTypes");
const { notificationRules } = require("./rules");

const PUSH_ENABLED_EVENTS = new Set([
  PushNotificationEventType.MESSAGE_RECEIVED,
  PushNotificationEventType.SELLER_REPLIED,
  PushNotificationEventType.MISSED_CHAT_REMINDER,
  PushNotificationEventType.OFFER_RECEIVED,
  PushNotificationEventType.OFFER_COUNTERED,
  PushNotificationEventType.OFFER_ACCEPTED,
  PushNotificationEventType.OFFER_EXPIRING,
  PushNotificationEventType.PAYMENT_SUCCESSFUL,
  PushNotificationEventType.PAYMENT_FAILED,
  PushNotificationEventType.BOOST_PACKAGE_EXPIRED,
  PushNotificationEventType.RENEWAL_REMINDER,
  PushNotificationEventType.SUSPICIOUS_ACTIVITY_ALERT,
  PushNotificationEventType.PASSWORD_CHANGED,
  PushNotificationEventType.NEW_LOGIN_DETECTED,
  PushNotificationEventType.AD_REJECTED,
  PushNotificationEventType.AD_REMOVED_BY_ADMIN,
  PushNotificationEventType.AD_EXPIRING_SOON,
]);

const pushNotificationRules = Object.keys(notificationRules).reduce((acc, eventType) => {
  acc[eventType] = (ctx) => {
    const template = notificationRules[eventType](ctx);
    return {
      title: template.title,
      body: template.message,
      data: ctx.data,
    };
  };
  return acc;
}, {});

module.exports = {
  pushNotificationRules,
  PushNotificationEventType,
  PUSH_ENABLED_EVENTS,
};
