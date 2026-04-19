const { Schema, model } = require("mongoose");
const {
  ALL_NOTIFICATION_EVENTS,
} = require("../services/notification/eventTypes");

const NotificationSchema = new Schema(
  {
    uuid: { type: String, required: true, unique: true },
    eventType: {
      type: String,
      enum: ALL_NOTIFICATION_EVENTS,
      required: true,
    },
    initiator: { type: String, required: true },
    receiver: { type: String, required: true },
    initiatorRole: {
      type: String,
      enum: ["buyer", "seller", "admin", "system", "customer"],
      default: "system",
    },
    receiverRole: {
      type: String,
      enum: ["buyer", "seller", "admin", "customer"],
      default: "customer",
    },
    contextId: { type: String },
    contextType: {
      type: String,
      enum: [
        "message",
        "offer",
        "ad",
        "payment",
        "package",
        "boost",
        "verification",
        "security",
        "favorite",
        "saved_search",
        "report",
        "policy",
        "account",
        "system",
      ],
      default: "system",
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    actions: {
      view: { type: Boolean, default: true },
      reply: { type: Boolean, default: false },
      offer: { type: Boolean, default: false },
      pay: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
    },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true },
);

NotificationSchema.index({ receiver: 1, createdAt: -1 });
NotificationSchema.index({ initiator: 1, createdAt: -1 });
NotificationSchema.index({ eventType: 1 });

module.exports = model("Notification", NotificationSchema, "notifications");
