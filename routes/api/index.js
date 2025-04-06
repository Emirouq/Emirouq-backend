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
router.use("/user", jwtValidation, require("./User.route"));
router.use("/category", jwtValidation, require("./Category.route"));
router.use(
  "/category/subCategory",
  jwtValidation,
  require("./SubCategory.route")
);
router.use("/post", jwtValidation, require("./Post.route"));
router.use("/conversation", jwtValidation, require("./Conversation.route"));

module.exports = router;
