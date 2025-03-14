const router = require("express").Router();

// bring in models and controllers
const addTag = require("../../controllers/tags/addTag");
const updateTag = require("../../controllers/tags/updateTag");
const deleteTag = require("../../controllers/tags/deleteTag");
const getTags = require("../../controllers/tags/getTags");
const getAllTags = require("../../controllers/tags/getAllTags");

// get user details
router.post("/", addTag);
router.get("/", getAllTags);
router.get("/:categoryId", getTags);
router.put("/:id", updateTag);
router.delete("/:id", deleteTag);

module.exports = router;
