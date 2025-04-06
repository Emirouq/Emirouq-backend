const { last } = require("lodash");
const { Schema, model } = require("mongoose");

const conversationSchema = new Schema(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
    },
    postId: {
      type: String,
      required: true,
    },
    // uuid of the user who are in the conversation
    users: [
      {
        type: String,
        required: true,
      },
    ],
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
    lastMessage: {
      type: String,
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

const Conversation = model("Conversation", conversationSchema, "conversation");
module.exports = Conversation;
