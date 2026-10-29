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

    const notification = options.group
      ? await this.upsertGrouped(eventType, payload, resolver, template)
      : await Notification.create(this.buildDocument(eventType, payload, template));

    if (options.push !== false) {
      await pushNotificationService.emit({
        eventType,
        payload: {
          ...payload,
          // The app needs these on tap: to mark the notification read, and to
          // show the merged count in the push text.
          data: {
            ...(notification?.data || payload.data || {}),
            notificationId: notification?.uuid,
          },
        },
        sendToAllDevices: options.sendToAllDevices,
        deviceId: options.deviceId,
      });
    }

    return notification;
  }

  buildDocument(eventType, payload, template) {
    return {
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
      data: { ...(payload.data || {}), groupCount: 1 },
    };
  }

  /**
   * One unread notification per receiver + event + context (for chat: one per
   * conversation). A new event folds into it, bumps `data.groupCount` and moves
   * it back to the top of the list, instead of adding another row. Once the
   * user reads it, the next event starts a fresh notification.
   */
  async upsertGrouped(eventType, payload, resolver, firstTemplate) {
    if (!payload.contextId) {
      return Notification.create(
        this.buildDocument(eventType, payload, firstTemplate),
      );
    }

    const filter = {
      receiver: payload.receiverId,
      eventType,
      contextId: payload.contextId,
      isRead: false,
    };
    const existing = await Notification.findOne(filter).lean();
    if (!existing) {
      return Notification.create(
        this.buildDocument(eventType, payload, firstTemplate),
      );
    }

    const groupCount = (Number(existing.data?.groupCount) || 1) + 1;
    const data = { ...(existing.data || {}), ...(payload.data || {}), groupCount };
    const template = resolver({
      actorRole: payload.initiatorRole,
      actorName: payload.initiatorName,
      recipientRole: payload.receiverRole,
      adTitle: payload.adTitle,
      amount: payload.amount,
      data,
    });
    const now = new Date();

    return Notification.findOneAndUpdate(
      { uuid: existing.uuid },
      {
        $set: {
          initiator: payload.initiatorId || existing.initiator,
          title: template.title,
          message: template.message,
          actions: template.actions || existing.actions,
          data,
          // The list is ordered by createdAt, so the merged row moves up.
          createdAt: now,
        },
      },
      { new: true, overwriteImmutable: true },
    ).lean();
  }
}

module.exports = {
  notificationService: new NotificationService(),
  pushNotificationService,
  ...require("./eventTypes"),
};
