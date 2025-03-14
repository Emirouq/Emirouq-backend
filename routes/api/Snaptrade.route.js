const router = require("express").Router();

// bring in models and controllers
const getAvailableBrokers = require("../../controllers/snaptrade/getAvailableBrokers");
const accountCreateRedirect = require("../../controllers/snaptrade/accountCreateRedirect");
const listUserBrokerAccounts = require("../../controllers/snaptrade/listUserBrokerAccounts");
const reconnectSnapLink = require("../../controllers/snaptrade/reconnectSnapLink");

// get user details
router.get("/available-brokers", getAvailableBrokers);
router.post("/login-redirect", accountCreateRedirect);
router.post("/list-accounts", listUserBrokerAccounts);
router.post("/reconnect", reconnectSnapLink);

module.exports = router;
