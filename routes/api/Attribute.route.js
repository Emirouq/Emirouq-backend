const getAttributeOptions = require("../../controllers/attributes/getAttributeOptions");
const getParentAttributeOptions = require("../../controllers/attributes/getParentAttributeOptions");
const getAttributes = require("../../controllers/attributes/getAttributes");

const router = require("express").Router();

//if will return brand models , year etc
router.get("/:subCategoryId", getAttributes);

//if will return attribute options ex: bmw , audi etc
router.get("/:attributeId/options", getAttributeOptions);

// if parentAttributeId is provided, it will return the child options
router.get("/:parentId/options/children", getParentAttributeOptions);

module.exports = router;
