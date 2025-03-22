const router = require("express").Router();
// APIS

router.use("/auth", require("./Auth.route"));
router.use("/stripe", require("./Stripe.route"));

const jwtValidation = require("../../middlewares/jwt_validation");

router.use("/me", jwtValidation, require("../../controllers/me/getMe"));
router.use(
  "/auth/admin/me",
  jwtValidation,
  require("../../controllers/me/getAdminMe")
);
router.use("/support", jwtValidation, require("./Support.route"));
router.use("/account", jwtValidation, require("./Account.route"));
// router.use("/report", jwtValidation, require("./Report.route"));
router.use("/user", jwtValidation, require("./User.route"));
// router.use("/transaction", jwtValidation, require("./Transaction.route"));
router.use("/category", jwtValidation, require("./Category.route"));
router.use(
  "/category/subCategory",
  jwtValidation,
  require("./SubCategory.route")
);
router.use("/post", jwtValidation, require("./Post.route"));
// router.use("/enquiry", require("./Enquiry.route"));
// router.post("/agenda", agendaCallService);
// router.post("/agenda/snap-commission", agendaCallServiceForSnapService);

//For historical Data

module.exports = router;
