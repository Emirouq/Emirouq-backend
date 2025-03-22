const router = require("express").Router();

//Admin APIS

const jwtValidation = require("../../middlewares/jwt_validation");

// router.use("/university", jwtValidation, require("./University.route"));
router.use("/user/admin", jwtValidation, require("./User.route"));
// router.use("/transaction", jwtValidation, require("./Transaction.route"));
// router.use("/dashboard", jwtValidation, require("./Dashboard.route"));
// router.use("/coupon", jwtValidation, require("./Coupon.route"));
// router.use("/enquiry", jwtValidation, require("./Enquiry.route"));
// router.use("/faq", jwtValidation, require("./Faq.route"));

module.exports = router;
