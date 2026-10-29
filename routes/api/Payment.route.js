const router = require("express").Router();
const { boostQuote, createBoostPayment } = require("../../controllers/payments/boost");
const paymentStatus = require("../../controllers/payments/status");
const myPayments = require("../../controllers/payments/myPayments");

router.get("/boost/:postId/quote", boostQuote);
router.post("/boost/:postId", createBoostPayment);
router.get("/status", paymentStatus);
router.get("/my", myPayments);

module.exports = router;
