const router = require("express").Router();

//Admin APIS

const jwtValidation = require("../../middlewares/jwt_validation");

router.use("/user", jwtValidation, require("./User.route"));
router.use("/stripe", require("./Stripe.route"));
router.use("/dashboard", jwtValidation, require("./Dashboard.route"));

module.exports = router;
