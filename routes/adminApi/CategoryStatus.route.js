const router = require("express").Router();
const { requirePermission } = require("../../middlewares/requirePermission");

const getCategoryImpact = require("../../adminController/categoryStatus/getCategoryImpact");
const updateCategoryStatus = require("../../adminController/categoryStatus/updateCategoryStatus");

// :type is "category" or "sub-category"
router.get("/:type/:id/impact", requirePermission("categories", "view"), getCategoryImpact);
router.put(
  "/:type/:id/status",
  requirePermission("categories", "edit", { audit: false }), // writes its own audit entry
  updateCategoryStatus
);

module.exports = router;
