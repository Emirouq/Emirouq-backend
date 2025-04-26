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
    type: {
      type: String,
      enum: ["text", "image", "video", "audio", "file"],
      default: "text",
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    emoji: {
      type: String,
    },
    attachments: [
      {
        url: {
          type: String,
        },
        name: {
          type: String,
        },
        type: {
          type: String,
        },
      },
    ],
  },

  {
    timestamps: true,
  }
);

const Chat = model("Chat", chatSchema, "chats");
module.exports = Chat;
