const router = require("express").Router();
// APIS

router.use("/auth", require("./Auth.route"));

const jwtValidation = require("../../middlewares/jwt_validation");

router.use("/stripe", jwtValidation, require("./Stripe.route"));
router.use("/me", jwtValidation, require("../../controllers/me/getMe"));
router.use(
  "/auth/admin/me",
  jwtValidation,
  require("../../controllers/me/getAdminMe")
);
router.use("/support", jwtValidation, require("./Support.route"));
router.use("/account", jwtValidation, require("./Account.route"));
router.use("/user", jwtValidation, require("./User.route"));
router.use("/category", require("./Category.route"));
router.use("/category/subCategory", require("./SubCategory.route"));
router.use("/post", require("./Post.route"));
router.use("/conversation", jwtValidation, require("./Conversation.route"));
router.use("/attributes", jwtValidation, require("./Attribute.route"));

module.exports = router;
