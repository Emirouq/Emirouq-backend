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
const checkSubscriptionForSpecificCategory = require("../../controllers/stripe/checkSubscriptionForSpecificCategory");
const refundPayment = require("../../controllers/stripe/refundPayment");
// const roleCheck = require("../../middlewares/roleCheck");
const createSubscription = require("../../controllers/stripe/createSubscription");
const listOfSubscriptionPlan = require("../../controllers/stripe/listOfSubscriptionPlan");

// get user details
router.post("/update/session", changeSubscription);
router.post("/payment-sheet/:planId", paymentSheet);
router.post("/subscription", createSubscription);
router.get("/check-subscription/:id", checkSubscription);
router.put("/cancel-next-billing", cancelNextBilling);

router.post("/subscription/trial", trialPeriodCheckout);

router.get("/subscription/future-invoice", getFutureInvoice);
router.get("/payment-method", getPaymentMethods);
router.delete("/delete-payment-method/:id", deletePaymentMethod);
router.put("/change-payment-method/:id", changePaymentMethod);
router.post("/payment-method", savePaymentMethod);
router.post("/refund", refundPayment);
router.get("/is_subscribed/:categoryId", checkSubscriptionForSpecificCategory);
router.get("/list-of-subscription-plan/:categoryId", listOfSubscriptionPlan);

// webhooks route

module.exports = router;
