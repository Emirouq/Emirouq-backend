const router = require("express").Router();

const cancelSubscription = require("../../adminController/user/cancelSubscription");
const createUser = require("../../adminController/user/createUser");
const getSingleUser = require("../../adminController/user/getSingleUser");
const updateUserStatus = require("../../adminController/user/updateUserStatus");
const exportUsers = require("../../adminController/user/exportUsers");
// bring in models and controllers
const getAllUsers = require("../../controllers/user/getAllUsers");
const roleCheck = require("../../middlewares/roleCheck");
const updateProfile = require("../../adminController/user/updateProfile");

// get user details
router.get(
  "/",
  (req, res, next) => roleCheck(req, res, next, ["admin"]),
  getAllUsers
);
router.get(
  "/export",
  (req, res, next) => roleCheck(req, res, next, ["admin"]),
  exportUsers
);
//this api will update the status (isActive) of the user  to false and vice versa,we are not deleting the user from the database
router.get("/:id", getSingleUser);
router.post("/add-user", createUser);
router.delete("/:id", updateUserStatus);
router.put("/:id/subscription", cancelSubscription);
router.put("/updateProfile", updateProfile);

module.exports = router;
