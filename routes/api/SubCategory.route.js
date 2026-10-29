const router = require("express").Router();
const jwtValidation = require("../../middlewares/jwt_validation");
const { requirePermission } = require("../../middlewares/requirePermission");

// bring in models and controllers

const addSubCategory = require("../../controllers/category/subCategory/addSubCatgory");
const deleteSubCategory = require("../../controllers/category/subCategory/deleteSubCategory");
const getSubCategory = require("../../controllers/category/subCategory/getSubCategories");
const updateSubCategory = require("../../controllers/category/subCategory/updateSubCategory");

router.post("/:categoryId", jwtValidation, requirePermission("categories", "create"), addSubCategory);
router.get("/:id", getSubCategory);

router.put(
  "/:categoryId/:subCategoryId",
  jwtValidation,
  requirePermission("categories", "edit"),
  updateSubCategory
);
router.delete("/:subCategoryId", jwtValidation, requirePermission("categories", "delete"), deleteSubCategory);

module.exports = router;
