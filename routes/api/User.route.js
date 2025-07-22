const router = require("express").Router();

// bring in models and controllers
const getAllUsers = require("../../controllers/user/getAllUsers");
const updateProfile = require("../../controllers/user/updateProfile");
const resetPassword = require("../../controllers/user/resetPassword");
const saveNotificationToken = require("../../controllers/user/saveNotificationToken");

router.put("/save-notification-token", saveNotificationToken);
router.put("/updateProfile", updateProfile);
router.put("/password/:token", resetPassword);
router.get("/", getAllUsers);

module.exports = router;
