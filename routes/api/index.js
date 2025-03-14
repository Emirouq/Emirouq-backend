const router = require("express").Router();
// APIS

router.use("/auth", require("./Auth.route"));
router.use("/stripe", require("./Stripe.route"));
router.use("/faq", require("./Faq.route"));

const jwtValidation = require("../../middlewares/jwt_validation");
const agendaCallService = require("../../controllers/broker/agendaCallService");

const agendaCallServiceForSnapService = require("../../controllers/broker/agendaCallServiceForSnapService");

router.use("/me", jwtValidation, require("../../controllers/me/getMe"));
router.use(
  "/auth/admin/me",
  jwtValidation,
  require("../../controllers/me/getAdminMe")
);
router.use("/trade", jwtValidation, require("./Trade.route"));
router.use("/support", jwtValidation, require("./Support.route"));
router.use("/university", jwtValidation, require("./University.route"));
router.use("/account", jwtValidation, require("./Account.route"));
router.use("/polygon", jwtValidation, require("./Polygon.route"));
router.use("/dashboard", jwtValidation, require("./Dashboard.route"));
router.use("/report", jwtValidation, require("./Report.route"));
router.use("/broker", jwtValidation, require("./BrokerSync.route"));
router.use("/user", jwtValidation, require("./User.route"));
router.use("/transaction", jwtValidation, require("./Transaction.route"));
router.use("/category", jwtValidation, require("./Category.route"));
router.use(
  "/category/subCategory",
  jwtValidation,
  require("./SubCategory.route")
);
router.use("/product", jwtValidation, require("./Product.route"));
router.use("/tags", jwtValidation, require("./Tags.route"));
router.use("/snaptrade", jwtValidation, require("./Snaptrade.route"));
router.use("/coupon", jwtValidation, require("./Coupon.route"));
router.use("/trading-diary", jwtValidation, require("./TradingDiary.route"));
router.use("/enquiry", require("./Enquiry.route"));
router.use("/notebook", jwtValidation, require("./Notebook.route"));
router.post("/agenda", agendaCallService);
router.post("/agenda/snap-commission", agendaCallServiceForSnapService);

//For historical Data
router.use("/historical-data", require("./HistoricalData.route"));

module.exports = router;
