const router = require("express").Router();

const getDetails = require("../../adminController/university/getAllSections");

router.get("/", getDetails);

module.exports = router;
