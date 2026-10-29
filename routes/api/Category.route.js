const router = require("express").Router();
const jwtValidation = require("../../middlewares/jwt_validation");
const { requirePermission } = require("../../middlewares/requirePermission");

// bring in models and controllers
const addCategory = require("../../controllers/category/addCategory");
const updateCategory = require("../../controllers/category/updateCategory");
const deleteCategory = require("../../controllers/category/deleteCategory");
const getCategory = require("../../controllers/category/getCategory");

// get user details
// Reads are public (the app lists categories). Changes need an admin with
// the right permission; these used to accept requests without any login.
router.post("/", jwtValidation, requirePermission("categories", "create"), addCategory);
router.get("/", getCategory);

router.put("/:id", jwtValidation, requirePermission("categories", "edit"), updateCategory);
router.delete("/:id", jwtValidation, requirePermission("categories", "delete"), deleteCategory);

module.exports = router;
