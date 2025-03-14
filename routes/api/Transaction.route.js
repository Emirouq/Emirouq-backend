const router = require("express").Router();

// bring in models and controllers
const getTransactions = require("../../controllers/transactions/getTransactions");

// get user details
router.get("/", getTransactions);

// webhooks route

module.exports = router;
