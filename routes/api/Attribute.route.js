const getAttributeOptions = require("../../controllers/attributes/getAttributeOptions");
const getParentAttributeOptions = require("../../controllers/attributes/getParentAttributeOptions");
const getAttributes = require("../../controllers/attributes/getAttributes");
const updateAttributeOption = require("../../controllers/attributes/updateAttributeOption");
const deleteAttributeOption = require("../../controllers/attributes/deleteAttributeOption");
const addAttributeOption = require("../../controllers/attributes/addAttributeOption");

const router = require("express").Router();
const jwtValidation = require("../../middlewares/jwt_validation");
const { requirePermission } = require("../../middlewares/requirePermission");

//if will return brand models , year etc
router.get("/:id", getAttributes);

//if will return attribute options ex: bmw , audi etc
router.get("/:attributeId/options", getAttributeOptions);

// if parentAttributeId is provided, it will return the child options
router.get("/:parentId/options/children", getParentAttributeOptions);

//update attribute Options
router.put(
  "/update-attribute/:attributeOptionId",
  jwtValidation,
  requirePermission("categories", "edit"),
  updateAttributeOption
);

//delete attribute Options
router.delete(
  "/delete-attribute/:attributeOptionId",
  jwtValidation,
  requirePermission("categories", "delete"),
  deleteAttributeOption
);

//add attribute Options
router.post(
  "/add-attribute-option/:attributeId",
  jwtValidation,
  requirePermission("categories", "create"),
  addAttributeOption
);

module.exports = router;
