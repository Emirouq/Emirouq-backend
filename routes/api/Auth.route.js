const router = require("express").Router();

const loginUser = require("../../controllers/auth/login");
const adminLogin = require("../../controllers/auth/adminLogin");
const register = require("../../controllers/auth/register");
const verifyToken = require("../../controllers/auth/verifyToken");
const setupPassword = require("../../controllers/auth/setupPassword");
const forgotPassword = require("../../controllers/auth/forgotPassword");
const verifyOTP = require("../../controllers/auth/verifyOTP");
const resetPassword = require("../../controllers/auth/resetPassword");
const oauthLogin = require("../../controllers/auth/oauthLogin");
const assumeLogin = require("../../controllers/auth/assume-login");
router.post("/login", loginUser);
router.post("/assume-login", assumeLogin);
router.post("/admin/login", adminLogin);
// Admin sign-in step 2: authenticator-app code (see controllers/auth/adminTwoFactor.js)
const { setupTwoFactor, verifyTwoFactor } = require("../../controllers/auth/adminTwoFactor");
router.post("/admin/2fa/setup", setupTwoFactor);
router.post("/admin/2fa/verify", verifyTwoFactor);
// Staff invitations (links emailed by a Super Admin)
const { getInvite, acceptInvite } = require("../../controllers/auth/adminInvite");
router.get("/admin/invite/:token", getInvite);
router.post("/admin/accept-invite", acceptInvite);
router.post("/register", register);
router.put("/verify/:token", verifyToken);
router.put("/setup-password/", setupPassword);
router.post("/forgotPassword", forgotPassword);
router.post("/verifyotp/:token", verifyOTP);
router.post("/resetpassword/:token", resetPassword);
router.post("/oauth/", oauthLogin);

module.exports = router;
