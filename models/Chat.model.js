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
