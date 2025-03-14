const router = require("express").Router();

// bring in models and controllers
const faqList = require("../../controllers/faqs/faqList");

router.get("/", faqList);

module.exports = router;
