const router = require("express").Router();

//Admin APIS

const jwtValidation = require("../../middlewares/jwt_validation");

router.use("/user", jwtValidation, require("./User.route"));
router.use("/stripe", jwtValidation, require("./Stripe.route"));

module.exports = router;
