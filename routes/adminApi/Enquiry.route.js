const router = require("express").Router();

// bring in models and controllers
const enquiryList = require("../../adminController/enquiry/enquiryList");
const replyToEnquiry = require("../../adminController/enquiry/replyToEnquiry");

router.get("/", enquiryList);
router.post("/reply", replyToEnquiry);

module.exports = router;
