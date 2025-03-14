const router = require("express").Router();

// bring in models and controllers
const addEnquiry = require("../../controllers/enquiry/addEnquiry");

router.post("/", addEnquiry);

module.exports = router;
