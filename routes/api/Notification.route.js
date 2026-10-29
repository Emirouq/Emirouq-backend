const router = require("express").Router();

const getMyNotifications = require("../../controllers/notification/getMyNotifications");
const markNotificationRead = require("../../controllers/notification/markNotificationRead");
const markAllNotificationsRead = require("../../controllers/notification/markAllNotificationsRead");
const getUnreadCount = require("../../controllers/notification/getUnreadCount");
const deleteNotification = require("../../controllers/notification/deleteNotification");
const clearNotifications = require("../../controllers/notification/clearNotifications");

router.get("/", getMyNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/context/:contextId/read", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);
router.delete("/", clearNotifications);
router.delete("/:id", deleteNotification);

module.exports = router;
