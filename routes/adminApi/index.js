const router = require("express").Router();

//Admin APIS

const jwtValidation = require("../../middlewares/jwt_validation");

router.use("/user", jwtValidation, require("./User.route"));
router.use("/stripe", jwtValidation, require("./Stripe.route"));
router.use("/dashboard", jwtValidation, require("./Dashboard.route"));
router.use("/free-post-settings", jwtValidation, require("./FreePost.route"));
router.use("/free-categories", jwtValidation, require("./FreeCategory.route"));
router.use("/import", jwtValidation, require("./Import.route"));
router.use("/support", jwtValidation, require("./Support.route"));
router.use("/categories", jwtValidation, require("./CategoryStatus.route"));
router.use("/audit-logs", jwtValidation, require("./Audit.route"));
router.use("/subscriptions", jwtValidation, require("./Subscription.route"));
router.use("/security", jwtValidation, require("./Security.route"));
router.use("/staff", jwtValidation, require("./Staff.route"));

module.exports = router;
