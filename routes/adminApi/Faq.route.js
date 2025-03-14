const router = require("express").Router();

// bring in models and controllers
const faqList = require("../../adminController/faqs/faqList");
const createFaq = require("../../adminController/faqs/createFaq");
const updateFaq = require("../../adminController/faqs/updateFaq");

router.post("/", createFaq);
router.get("/", faqList);
router.put("/:id", updateFaq);

module.exports = router;
