const { Schema, model } = require("mongoose");

// create a schema
var resetPasswordSchema = new Schema(
  {
    otp: { type: String, required: true },
    email: { type: String, unique: true },
    phoneNumber: { type: Number, unique: true },
    isVerified: { type: Boolean, default: false },
    createdAt: { type: Date, expires: "5m", default: Date.now },
  },
  {
    versionKey: false,
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);
const TestPaper = model("ResetPassword", resetPasswordSchema, "resetpassword");

module.exports = TestPaper;
