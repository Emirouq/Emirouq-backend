const { Schema, model } = require("mongoose");

const supportTicketSchema = new Schema(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
    },
    ticketNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    // uuid of the user
    user: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["suggestion", "feedback", "bug", "feature-request"],
      default: "bug",
    },
    subject: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    //user uuid
    closedBy: {
      type: String,
    },
    //user uuid
    reOpenBy: {
      type: String,
    },

    // support activity uuid
    activity: [
      {
        type: String,
      },
    ],

    //a conversation would be considered unread for a user if:
    // the user is in the participant array
    // and the conversation lastMessageTime value is greater than the participant's lastViewedTime value
    participants: [
      {
        user: {
          type: String,
        },
        // in this the last viewed time will be updated when the user views the conversation
        lastViewedTime: {
          type: Number, // the last date the user checked the conversation in UNIX timestamp
        },
        count: {
          type: Number,
          default: 0,
        },
      },
    ],
    // in this the last message time will be updated when the user sends a message
    lastMessageTime: {
      type: Number, // the last date the message was updated in UNIX timestamp
    },
    isDeleted: {
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
