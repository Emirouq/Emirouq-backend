const router = require("express").Router();
const { requirePermission } = require("../../middlewares/requirePermission");

const getFreeCategories = require("../../adminController/freeCategory/getFreeCategories");
const updateFreeCategory = require("../../adminController/freeCategory/updateFreeCategory");

router.get("/", requirePermission("categories", "view"), getFreeCategories);
// :type is "category" or "sub-category"
router.put(
  "/:type/:id",
  requirePermission("categories", "edit", { audit: false }), // writes its own audit entry
  updateFreeCategory
);

module.exports = router;
