const router = require("express").Router();

const getMyNotifications = require("../../controllers/notification/getMyNotifications");

router.get("/", getMyNotifications);

module.exports = router;
