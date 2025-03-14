const { Schema, model } = require("mongoose");

const AdminSchema = new Schema(
  {
    uuid: {
      type: String,
      required: false,
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },

    role: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = model("Admin", AdminSchema, "admin");
