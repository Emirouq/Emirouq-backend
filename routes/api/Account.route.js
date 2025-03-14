const router = require("express").Router();

// bring in models and controllers
const addAccount = require("../../controllers/account/addAccount");
const updateAccount = require("../../controllers/account/updateAccount");
const deleteAccount = require("../../controllers/account/deleteAccount");

// get user details
router.post("/", addAccount);
router.put("/:id", updateAccount);
router.delete("/:id", deleteAccount);

module.exports = router;
