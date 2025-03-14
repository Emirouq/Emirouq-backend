const router = require("express").Router();

// bring in models and controllers
// const getCouponsList = require("../../adminController/coupon/getCouponsList");
const createCoupon = require("../../adminController/coupon/createCoupon");
const getCouponsList = require("../../adminController/coupon/getCouponsList");
const deleteCoupon = require("../../adminController/coupon/deleteCoupon");

// get coupons list
router.get("/", getCouponsList);
// create coupon
router.post("/", createCoupon);
//delete coupon
router.delete("/:id", deleteCoupon);

module.exports = router;
