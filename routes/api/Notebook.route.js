const router = require("express").Router();

const getNotebook = require("../../controllers/notebook/getNotebook");

router.get("/", getNotebook);

module.exports = router;
