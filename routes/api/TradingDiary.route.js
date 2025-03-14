const router = require("express").Router();

// bring in models and controllers
const getTrades = require("../../controllers/trading-diary/getTrades");
const addNotes = require("../../controllers/trading-diary/addNotes");

router.get("/", getTrades);
router.put("/notes", addNotes);

module.exports = router;
