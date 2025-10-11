const router = require("express").Router();

// bring in models and controllers

const addSubCategory = require("../../controllers/category/subCategory/addSubCatgory");
const deleteSubCategory = require("../../controllers/category/subCategory/deleteSubCategory");
const getSubCategory = require("../../controllers/category/subCategory/getSubCategories");
const updateSubCategory = require("../../controllers/category/subCategory/updateSubCategory");

router.post("/:categoryId", addSubCategory);
router.get("/:id", getSubCategory);

router.put("/:categoryId/:subCategoryId", updateSubCategory);
router.delete("/:id", deleteSubCategory);

module.exports = router;
