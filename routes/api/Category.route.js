const router = require("express").Router();

// bring in models and controllers
const addCategory = require("../../controllers/category/addCategory");
const updateCategory = require("../../controllers/category/updateCategory");
const deleteCategory = require("../../controllers/category/deleteCategory");
const getCategory = require("../../controllers/category/getCategory");
const groupCategory = require("../../controllers/category/groupCategory");

// get user details
router.post("/", addCategory);
router.get("/", getCategory);

router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

module.exports = router;
