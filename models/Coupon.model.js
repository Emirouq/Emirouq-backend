const { Schema, model } = require("mongoose");

const Coupon = new Schema(
  {
    stripeCouponId: {
      type: String,
      required: false,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
    },
    // Specifies how long the discount will be in effect. Can be forever, once, or repeating.
    duration: {
      type: String,
      required: true,
      enum: ["repeating", "once", "forever"],
    },
    // specifies the number of months the discount will be in effect, Required only if duration is repeating
    durationInMonths: {
      type: Number,
    },
    // required if percent_off is not passed
    amountOff: {
      type: Number,
    },
    // required if amount_off is not passed
    percentOff: {
      type: Number,
    },
    // number of times the coupon can be redeemed
    maxRedemptions: {
      type: Number,
    },
    // Unix timestamp specifying the last time at which the coupon can be redeemed
    redeemBy: {
      type: Number,
    },
    timesRedeemed: {
      type: Number,
      default: 0,
    },
    // We are creating a promotion code with the same name as coupon code because the checkout session only accepts promotion codes
    promoCodeId: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true }
);

module.exports = model("Coupon", Coupon, "coupon");
