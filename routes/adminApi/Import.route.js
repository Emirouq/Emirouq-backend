const router = require("express").Router();
const { requirePermission } = require("../../middlewares/requirePermission");

const getImportTemplate = require("../../adminController/import/getImportTemplate");
const importMasterData = require("../../adminController/import/importMasterData");

router.get("/template", requirePermission("import", "create"), getImportTemplate);
// Validation runs are not changes; the controller audits real imports.
router.post("/", requirePermission("import", "create", { audit: false }), importMasterData);

module.exports = router;
