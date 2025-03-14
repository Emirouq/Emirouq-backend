const CouponModel = require("../../models/Coupon.model");
const stripe = require("../../services/stripe/getStripe");

const deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const couponExist = await CouponModel.findOne({ stripeCouponId: id });
    if (!couponExist) {
      throw new Error("Coupon not found");
    }
    //first delete from stripe
    await stripe.coupons.del(id);

    // then delete from db
    await CouponModel.findOneAndDelete({ stripeCouponId: id });

    res.json({
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = deleteCoupon;
