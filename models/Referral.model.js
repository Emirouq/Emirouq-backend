const { Schema, model, Types } = require("mongoose");

const referralSchema = new Schema({
  referrer: {
    type: String,
    ref: "User",
    required: true,
  },
  referredUser: {
    type: String,
    ref: "User",
    required: true,
  },
  dateReferred: {
    type: Date,
    default: Date.now,
  },
  creditsAwarded: {
    type: Number,
    default: 5,
  },
  isCreditApplied: {
    type: Boolean,
    default: false,
  },
});

referralSchema.index({ referrer: 1, referredUser: 1 });
const Referral = model("Referral", referralSchema, "referrals");

module.exports = Referral;
