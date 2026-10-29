const router = require("express").Router();
const { requirePermission } = require("../../middlewares/requirePermission");

const getFreePostSettings = require("../../adminController/freePost/getFreePostSettings");
const updateFreePostSettings = require("../../adminController/freePost/updateFreePostSettings");

router.get("/", requirePermission("freePosting", "view"), getFreePostSettings);
router.put("/", requirePermission("freePosting", "edit"), updateFreePostSettings);

module.exports = router;
