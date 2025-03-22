const router = require("express").Router();

// bring in models and controllers
const getAllUsers = require("../../controllers/user/getAllUsers");
const updateProfile = require("../../controllers/user/updateProfile");
const resetPassword = require("../../controllers/user/resetPassword");

router.put("/updateProfile", updateProfile);
router.put("/password/:token", resetPassword);

const roleCheck = require("../../middlewares/roleCheck");

router.get("/", getAllUsers);

module.exports = router;
