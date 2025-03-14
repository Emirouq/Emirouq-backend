const router = require("express").Router();

const addProduct = require("../../controllers/product/addProduct");

router.post("/", addProduct);

module.exports = router;
