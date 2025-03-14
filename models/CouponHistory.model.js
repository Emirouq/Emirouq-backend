const { Schema, model } = require("mongoose");

const CouponHistory = new Schema(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
    },
    // user
    user: {
      type: String,
      required: true,
    },

    discounts: [
      {
        type: Object,
      },
    ],
    subscriptionId: {
      type: String,
      required: true,
    },
    promoCode: {
      type: Object,
      required: true,
    },
    couponCode: {
      type: Object,
      required: true,
    },
    couponName: {
      type: Object,
      required: true,
    },

    isUsed: {
      type: Boolean,
      default: false,
    },
    transactions: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = model("CouponHistory", CouponHistory, "couponHistory");
