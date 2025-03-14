const dayjs = require("dayjs");
const Coupon = require("../../models/Coupon.model");
const User = require("../../models/User.model");
const stripe = require("../../services/stripe/getStripe");
const CouponHistoryModel = require("../../models/CouponHistory.model");
const { v4: uuid } = require("uuid");
const applyCoupon = async (req, res, next) => {
  try {
    const { couponCode } = req.body;
    const { uuid: userId } = req.user;

    const user = await User.findOne({ uuid: userId });
    if (!user) {
      throw new Error("User not found");
    }
    if (!user.stripe.subscriptionId) {
      throw new Error("You are not subscribed to any plan");
    }

    const existingSub = await stripe.subscriptions.retrieve(
      user.stripe.subscriptionId,
      {
        expand: ["discounts"],
      }
    );

    //these are in unix timestamp format

    const subscriptionStartDate = new Date(
      existingSub.current_period_start * 1000
    );
    const subscriptionEndDate = new Date(existingSub.current_period_end * 1000);

    // find user, if user coupon history for this month is already applied

    // later if user can add multiple coupons in a month, then we can FIND instead of findOne
    // so that i can check according to length of array

    if (user?.email !== "thepunjabitrader98@gmail.com") {
      const userCouponHistory = await CouponHistoryModel.findOne({
        user: userId,
        isUsed: false,
        createdAt: {
          $gte: subscriptionStartDate, // Check if coupon history creation date is greater than or equal to subscription start date
          $lt: subscriptionEndDate, // Check if coupon history creation date is less than subscription end date
        },
      });
      if (userCouponHistory) {
        throw new Error("You have already applied coupon for this month");
      }
    }
    // check if coupon is expired or not on our DB level
    const response = await Coupon.findOne({
      name: couponCode,
      redeemBy: { $gt: dayjs().unix() },
    });

    if (!response) {
      throw new Error("Invalid Coupon, Please try again");
    }
    // on safe side check if coupon is valid from stripe level
    const coupon = await stripe.coupons.retrieve(response.stripeCouponId);
    if (!coupon.valid) {
      throw new Error("Invalid Coupon, Please try again");
    }

    // check if promo code is valid for user on stripe level
    const promotionCode = await stripe.promotionCodes.retrieve(
      response?.promoCodeId
    );
    if (!promotionCode?.active) {
      throw new Error("Invalid Code, Please try again");
    }

    // update subscription with coupon
    await stripe.subscriptions.update(user?.stripe?.subscriptionId, {
      discounts: [
        ...existingSub?.discounts?.map((i) => ({
          promotion_code: i?.promotion_code,
        })),
        {
          promotion_code: response?.promoCodeId,
        },
      ],
    });

    //create coupon history
    await CouponHistoryModel.create({
      uuid: uuid(),
      user: userId,
      couponCode: response?.stripeCouponId,
      couponName: response?.name,
      promoCode: response?.promoCodeId,
      subscriptionId: user?.stripe?.subscriptionId,
      isUsed: false,
    });

    res.json({
      message: "Coupon applied successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = applyCoupon;
