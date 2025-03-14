const httpErrors = require("http-errors");
const Product = require("../../models/product.model");
const { v4: uuid } = require("uuid");
const addProduct = async (req, res, next) => {
  try {
    const { title, description, price, img, properties } = req.body;
    const { uuid: subCategory } = req.params;
    if (!title) throw httpErrors.BadRequest("Title is required");
    if (!description) throw httpErrors.BadRequest("Description is required");

    if (!category) throw httpErrors.BadRequest("Category ID is required");
    // if (!Array.isArray(img) || img.length === 0)
    //   throw httpErrors.BadRequest("Image array cannot be empty");
    if (!Array.isArray(properties))
      throw httpErrors.BadRequest("Properties must be an array");

    const newProduct = new Product({
      uuid: uuid(),
      title,
      description,
      price,
      img,
      subCategory,
      properties,
    });
    await newProduct.save();

    res.status(201).json({
      message: "Product added successfully",
      product: newProduct,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = addProduct;
