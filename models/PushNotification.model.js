const { Schema, model } = require("mongoose");
const pushNotificationSchema = new Schema({
  uuid: { type: String, unique: true, required: true }, // Unique identifier for the push notification
  user: { type: String, required: true },
  token: { type: String, required: true },
  device: { type: String, required: true }, // Assuming you want to store the device type
  deviceId: { type: String, required: true }, // Unique identifier for the device
  deviceName: { type: String, required: true }, // Name of the device (
});

pushNotificationSchema.index({ user: 1, deviceId: 1 }, { unique: true }); // Ensure unique deviceId per user
pushNotificationSchema.index({ user: 1, token: 1 }); // Ensure unique token per user
pushNotificationSchema.index(
  { user: 1, device: 1, deviceId: 1, deviceName: 1 },
  { unique: true }
); // Ensure unique token per user and device
const PushNotification = model(
  "PushNotification",
  pushNotificationSchema,
  "pushNotifications"
);

module.exports = PushNotification;
