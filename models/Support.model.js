const { Schema, model } = require("mongoose");

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
    },
    user: {
      type: String,
      ref: "user",
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    attachments: {
      type: Object,
    },
    adminResponse: {
      type: String,
    },
    responded: {
      type: Boolean,
      default: false,
    },
  },

  {
    timestamps: true,
  }
);

const SupportTicket = model(
  "SupportTicket",
  supportTicketSchema,
  "supportTicket"
);
module.exports = SupportTicket;
