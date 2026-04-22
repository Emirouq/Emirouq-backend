const { v4: generateUuid } = require("uuid");
const Notification = require("../../models/Notification.model");
const { notificationRules } = require("./rules");
const pushNotificationService = require("./pushService");

class NotificationService {
  async emit(eventType, payload, options = {}) {
    const {
      ensureNotificationLifecycleJobs,
    } = require("./jobs/lifecycleQueue");

    await ensureNotificationLifecycleJobs();

    const resolver = notificationRules[eventType];
    if (!resolver) {
      throw new Error(`No notification rule defined for event: ${eventType}`);
    }

    const template = resolver({
      actorRole: payload.initiatorRole,
      actorName: payload.initiatorName,
      recipientRole: payload.receiverRole,
      adTitle: payload.adTitle,
      amount: payload.amount,
      data: payload.data,
    });

    if (!template?.title || !template?.message) {
      throw new Error(`Notification template resolution failed for event: ${eventType}`);
    }

    await Notification.create({
      uuid: generateUuid(),
      eventType,
      initiator: payload.initiatorId || "system",
      receiver: payload.receiverId,
      initiatorRole: payload.initiatorRole || "system",
      receiverRole: payload.receiverRole || "customer",
      contextId: payload.contextId,
      contextType: payload.contextType || "system",
      title: template.title,
      message: template.message,
      actions: template.actions || {},
      data: payload.data || {},
    });

    if (options.push !== false) {
      await pushNotificationService.emit({
        eventType,
        payload,
        sendToAllDevices: options.sendToAllDevices,
        deviceId: options.deviceId,
      });
    }
  }
}

module.exports = {
  notificationService: new NotificationService(),
  pushNotificationService,
  ...require("./eventTypes"),
};
