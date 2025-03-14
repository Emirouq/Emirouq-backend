const router = require("express").Router();

const loginUser = require("../../controllers/auth/login");
const adminLogin = require("../../controllers/auth/adminLogin");
const register = require("../../controllers/auth/register");
const verifyToken = require("../../controllers/auth/verifyToken");
const setupPassword = require("../../controllers/auth/setupPassword");
const forgotPassword = require("../../controllers/auth/forgotPassword");
const verifyOTP = require("../../controllers/auth/verifyOTP");
const resetPassword = require("../../controllers/auth/resetPassword");
const assumeLogin = require("../../controllers/auth/assume-login");
router.post("/login", loginUser);
router.post("/assume-login", assumeLogin);
router.post("/admin/login", adminLogin);
router.post("/register", register);
router.put("/verify/:token", verifyToken);
router.put("/setup-password/", setupPassword);
router.post("/forgotPassword", forgotPassword);
router.post("/verifyotp/:token", verifyOTP);
router.post("/resetpassword/:token", resetPassword);

module.exports = router;
