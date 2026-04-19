const Notification = require("../../models/Notification.model");
const User = require("../../models/User.model");
const { notificationService, NotificationEventType } = require("./index");

const getUserByCustomerId = async (customerId) => {
  if (!customerId) {
    return null;
  }
  return User.findOne({ customerId });
};

const emitPaymentNotification = async (userOrId, eventType, extra = {}) => {
  const receiverId = typeof userOrId === "string" ? userOrId : userOrId?.uuid;
  if (!receiverId || !eventType) {
    return;
  }

  const contextId = extra.contextId || extra.subscriptionId || extra.paymentIntentId || extra.refundId;
  if (contextId) {
    const alreadyExists = await Notification.exists({
      receiver: receiverId,
      eventType,
      contextId,
    });
    if (alreadyExists) {
      return;
    }
  }

  await notificationService.emit(
    eventType,
    {
      initiatorId: extra.initiatorId || "system",
      receiverId,
      initiatorRole: extra.initiatorRole || "system",
      receiverRole: "customer",
      contextId,
      contextType: extra.contextType || "payment",
      amount: extra.amount,
      data: {
        amount: extra.amount,
        currency: extra.currency,
        subscriptionId: extra.subscriptionId,
        paymentIntentId: extra.paymentIntentId,
        invoiceId: extra.invoiceId,
        refundId: extra.refundId,
        packageName: extra.packageName,
        planName: extra.planName,
        endDate: extra.endDate,
        ...extra.data,
      },
    },
    {
      push: extra.push,
    }
  );
};

const notificationExists = async ({ receiver, eventType, contextId, endDate }) =>
  Notification.exists({
    receiver,
    eventType,
    ...(contextId ? { contextId } : {}),
    ...(endDate ? { "data.endDate": endDate } : {}),
  });

module.exports = {
  getUserByCustomerId,
  emitPaymentNotification,
  notificationExists,
  NotificationEventType,
};
