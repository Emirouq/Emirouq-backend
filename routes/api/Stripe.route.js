const router = require("express").Router();

// bring in models and controllers
const paymentSheet = require("../../controllers/stripe/paymentSheet");
const changeSubscription = require("../../controllers/stripe/changeSubscription");
const getFutureInvoice = require("../../controllers/stripe/getFutureInvoice");
const savePaymentMethod = require("../../controllers/stripe/savePaymentMethod");
const getPaymentMethods = require("../../controllers/stripe/getPaymentMethods");
const cancelNextBilling = require("../../controllers/stripe/cancel_next_billing");
const trialPeriodCheckout = require("../../controllers/stripe/trialPeriodCheckout");
const deletePaymentMethod = require("../../controllers/stripe/deletePaymentMethod");
const changePaymentMethod = require("../../controllers/stripe/changePaymentMethod");
const checkSubscription = require("../../controllers/stripe/checkSubscription");
const refundPayment = require("../../controllers/stripe/refundPayment");
// const roleCheck = require("../../middlewares/roleCheck");
const jwtValidation = require("../../middlewares/jwt_validation");
const createSubscription = require("../../controllers/stripe/createSubscription");

// get user details
router.post("/update/session", jwtValidation, changeSubscription);
router.get("/payment-sheet/:planId", jwtValidation, paymentSheet);
router.post("/subscription", jwtValidation, createSubscription);
router.get("/check-subscription/:id", jwtValidation, checkSubscription);
router.put("/cancel-next-billing", jwtValidation, cancelNextBilling);

router.post("/subscription/trial", jwtValidation, trialPeriodCheckout);

router.get("/subscription/future-invoice", jwtValidation, getFutureInvoice);
router.get("/payment-method", jwtValidation, getPaymentMethods);
router.delete("/delete-payment-method/:id", jwtValidation, deletePaymentMethod);
router.put("/change-payment-method/:id", jwtValidation, changePaymentMethod);
router.post("/payment-method", jwtValidation, savePaymentMethod);
router.post("/refund", jwtValidation, refundPayment);

// webhooks route

module.exports = router;
