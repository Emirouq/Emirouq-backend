const PushNotification = require("../../models/PushNotification.model");
const pushNotification = require("../../utils/pushNotification.utils");
const { pushNotificationRules, PUSH_ENABLED_EVENTS } = require("./pushRules");

class PushNotificationService {
  async emit({ eventType, payload, sendToAllDevices = true, deviceId }) {
    if (!PUSH_ENABLED_EVENTS.has(eventType)) {
      return;
    }

    const resolver = pushNotificationRules[eventType];
    if (!resolver) {
      console.error(`No push notification rule defined for event: ${eventType}`);
      return;
    }

    const template = resolver({
      actorRole: payload.initiatorRole,
      actorName: payload.initiatorName,
      recipientRole: payload.receiverRole,
      adTitle: payload.adTitle,
      amount: payload.amount,
      data: payload.data,
    });

    if (!template?.title || !template?.body) {
      console.error(`Push notification template resolution failed for event: ${eventType}`);
      return;
    }

    const query = {
      user: payload.receiverId,
      loggedIn: true,
    };

    if (deviceId) {
      query.deviceId = deviceId;
    }

    const devices =
      sendToAllDevices || !deviceId
        ? await PushNotification.find(query)
        : await PushNotification.find(query).limit(1);

    if (!devices.length) {
      return;
    }

    const results = await Promise.allSettled(
      devices.map((device) =>
        pushNotification({
          expoPushToken: device.token,
          message: {
            title: template.title,
            body: template.body,
            data: template.data,
          },
        })
      )
    );

    const failed = results.filter((result) => result.status === "rejected").length;
    if (failed > 0) {
      const succeeded = results.length - failed;
      console.warn(`Push notification: ${succeeded} succeeded, ${failed} failed for event: ${eventType}`);
    }
  }

  async emitToMany(eventType, payloads) {
    await Promise.allSettled(
      payloads.map((payload) =>
        this.emit({
          eventType,
          payload,
        })
      )
    );
  }
}

module.exports = new PushNotificationService();
