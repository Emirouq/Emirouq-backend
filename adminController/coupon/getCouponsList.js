const CouponModel = require("../../models/Coupon.model");

const getCouponsList = async (req, res, next) => {
  try {
    const response = await CouponModel.find().sort({ createdAt: -1 });

    res.json({
      message: "Coupons fetched successfully",
      data: response,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getCouponsList;
