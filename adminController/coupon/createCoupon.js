const CouponModel = require("../../models/Coupon.model");
const stripe = require("../../services/stripe/getStripe");

const createCoupon = async (req, res, next) => {
  try {
    const {
      name,
      duration,
      durationInMonths,
      amountOff,
      percentOff,
      maxRedemptions,
      redeemBy,
    } = req.body;

    if (!name || !duration) {
      // return res.status(400).json({
      //   message: "Please provide name and duration",
      // });
      throw new Error("Please provide name and duration");
    }
    if (duration === "repeating" && !durationInMonths) {
      // return res.status(400).json({
      //   message: "Please provide duration in months",
      // });
      throw new Error("Please provide duration in months");
    }
    if (!amountOff && !percentOff) {
      // return res.status(400).json({
      //   message: "Please provide an amount off or percent off",
      // });
      throw new Error("Please provide an amount off or percent off");
    }

    const existingCoupon = await CouponModel.findOne({
      name: name?.toUpperCase()?.trim(),
    });

    if (existingCoupon) {
      // return res.status(400).json({
      //   message: "Coupon already exists",
      // });
      throw new Error("Coupon already exists");
    }

    const payload = {
      name: name?.toUpperCase()?.trim(),
      duration,
      ...(durationInMonths && { duration_in_months: +durationInMonths }),
      ...(amountOff && { amount_off: +amountOff, currency: "USD" }),
      ...(percentOff && { percent_off: +percentOff }),
      ...(maxRedemptions && { max_redemptions: +maxRedemptions }),
      ...(redeemBy && { redeem_by: redeemBy }),
      // amount_off: amountOff,
      // percent_off: percentOff,
      // max_redemptions: maxRedemptions,
      // redeem_by: redeemBy,
    };

    const coupon = await stripe.coupons.create(payload);
    const promoCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: name,
    });

    const response = await CouponModel.create({
      stripeCouponId: coupon.id,
      name: coupon.name,
      duration: coupon.duration,
      durationInMonths: coupon.duration_in_months,
      amountOff: coupon.amount_off,
      percentOff: coupon.percent_off,
      maxRedemptions: coupon.max_redemptions,
      redeemBy: coupon.redeem_by,
      promoCodeId: promoCode.id,
    });

    res.json({
      message: "Coupon created successfully",
      data: response,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = createCoupon;
