const router = require("express").Router();
const { requirePermission, requireAdmin } = require("../../middlewares/requirePermission");

const cancelSubscription = require("../../adminController/user/cancelSubscription");
const createUser = require("../../adminController/user/createUser");
const getSingleUser = require("../../adminController/user/getSingleUser");
const updateUserStatus = require("../../adminController/user/updateUserStatus");
const exportUsers = require("../../adminController/user/exportUsers");
// bring in models and controllers
const getAllUsers = require("../../controllers/user/getAllUsers");
const updateProfile = require("../../adminController/user/updateProfile");

// get user details
router.get("/", requirePermission("users", "view"), getAllUsers);
router.get("/export", requirePermission("users", "export"), exportUsers);
//this api will update the status (isActive) of the user  to false and vice versa,we are not deleting the user from the database
// Also used by the app for public profiles; the controller decides what to show.
router.get("/:id", getSingleUser);
router.post("/add-user", requirePermission("users", "create"), createUser);
router.delete("/:id", requirePermission("users", "delete"), updateUserStatus);
router.put("/:id/subscription", requirePermission("subscriptions", "edit"), cancelSubscription);
router.put("/updateProfile", requireAdmin, updateProfile); // own profile

module.exports = router;
