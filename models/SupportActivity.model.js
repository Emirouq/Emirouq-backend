const { Schema, model } = require("mongoose");

const supportActivitySchema = new Schema(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
    },

    supportId: {
      type: String,
      required: true,
    },
    userType: {
      type: String,
      enum: ["admin", "customer"],
    },
    //uuid of the user
    user: {
      type: String,
    },
    message: {
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

const SupportActivity = model(
  "SupportActivity",
  supportActivitySchema,
  "supportActivity"
);
module.exports = SupportActivity;
