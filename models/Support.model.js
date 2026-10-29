const { Schema, model } = require("mongoose");

/**
 * Support ticket. One model for help requests ("general") and for reports of
 * an advertisement, a user or a chat, so admins work them in one queue.
 */

const TicketHistorySchema = new Schema(
  {
    uuid: { type: String, required: true },
    at: { type: Date, default: Date.now },
    // created | status_changed | assigned | responded | note | ad_deactivated
    // | ad_removed | ad_restored | duplicate_report
    action: { type: String, required: true },
    by: { type: String }, // user or admin uuid; "system" for automatic steps
    byRole: { type: String, enum: ["customer", "admin", "system"] },
    byName: { type: String },
    fromStatus: { type: String },
    toStatus: { type: String },
    // For ad actions: the ad's status before and after.
    adStatusFrom: { type: String },
    adStatusTo: { type: String },
    note: { type: String },
    // false for internal admin notes; the user only sees public entries.
    visibleToUser: { type: Boolean, default: true },
  },
  { _id: false }
);

const supportTicketSchema = new Schema(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
    },
    ticketNumber: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["general", "ad_report", "user_report", "chat_report"],
      default: "general",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    // The user who created the ticket (the reporter, for reports).
    user: {
      type: String,
      ref: "user",
    },
    title: {
      type: String,
      required: true,
    },
    // The user's message; for reports, their additional comments.
    description: {
      type: String,
      required: true,
    },
    // Report fields: a key from helpers/supportTickets.js REPORT_REASONS.
    reason: { type: String },
    postId: { type: String }, // reported ad
    reportedUserId: { type: String }, // seller / reported user
    conversationId: { type: String }, // reported chat
    assignedTo: { type: String }, // admin uuid
    assignedToName: { type: String },
    attachments: {
      type: Object,
    },
    // Latest reply shown to the user.
    adminResponse: {
      type: String,
    },
    responded: {
      type: Boolean,
      default: false,
    },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    history: [TicketHistorySchema],
  },

  {
    timestamps: true,
  }
);

supportTicketSchema.index({ user: 1, createdAt: -1 });
supportTicketSchema.index({ type: 1, status: 1, createdAt: -1 });
supportTicketSchema.index({ postId: 1, status: 1 });
supportTicketSchema.index({ reportedUserId: 1, status: 1 });

const SupportTicket = model(
  "SupportTicket",
  supportTicketSchema,
  "supportTicket"
);
module.exports = SupportTicket;
