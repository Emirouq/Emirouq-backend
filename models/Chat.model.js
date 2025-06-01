const { Schema, model } = require("mongoose");

const chatSchema = new Schema(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
    },

    conversationId: {
      type: String,
      required: true,
    },
    user: {
      type: String,
    },
    // users's uuid,who has seen the message
    seenBy: [
      {
        type: String,
      },
    ],

    message: {
      type: String,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    emoji: [
      {
        type: String,
      },
    ],
    audio: {
      uri: {
        type: String,
      },
      duration: {
        type: String,
      },
      type: {
        type: String,
        enum: ["audio", "voice"],
        default: "audio",
      },
      mimeType: {
        type: String,
      },
    },
    attachments: [
      {
        uuid: {
          type: String,
        },
        uri: {
          type: String,
        },
        name: {
          type: String,
        },
        type: {
          type: String,
        },
        emoji: [
          {
            type: String,
          },
        ],
      },
    ],
  },

  {
    timestamps: true,
  }
);

const Chat = model("Chat", chatSchema, "chats");
module.exports = Chat;
