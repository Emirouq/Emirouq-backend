const router = require("express").Router();

// bring in models and controllers
const applyCoupon = require("../../controllers/coupon/applyCoupon");

// apply coupon
router.put("/apply", applyCoupon);

module.exports = router;
