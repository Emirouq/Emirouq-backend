const router = require("express").Router();

const getMyNotifications = require("../../controllers/notification/getMyNotifications");
const markNotificationRead = require("../../controllers/notification/markNotificationRead");
const getUnreadCount = require("../../controllers/notification/getUnreadCount");

router.get("/", getMyNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/:id/read", markNotificationRead);

module.exports = router;
