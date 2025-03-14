const { Schema, model } = require("mongoose");

const AccountSchema = new Schema(
  {
    uuid: {
      type: String,
      required: false,
      unique: true,
    },
    accountName: {
      type: String,
      required: true,
    },
    user: {
      type: String,
      required: true,
    },
    calculationMethod: {
      type: String,
      required: true,
      enum: ["fifo", "lifo", "wa"],
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "inactive"],
      default: "active",
    },
    accountLocation: {
      enum: ["us", "non-us"],
      default: "us",
      type: String,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: "USD",
    },
  },
  { timestamps: true }
);

module.exports = model("Account", AccountSchema, "accounts");
