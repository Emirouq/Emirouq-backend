const httpErrors = require("http-errors");
const SubCategory = require("../../../models/SubCategory.model");
const { v4: uuid } = require("uuid");

const addSubCategory = async (req, res, next) => {
  try {
    const { title, properties } = req.body;
    const { id: category } = req.params;
    console.log("category", category);
    if (!title) {
      throw httpErrors.BadRequest("Title is required");
    }
    if (!category) {
      throw httpErrors.BadRequest("Category is required");
    }
    console.log("properties", properties);
    // let parsedProperties;
    // try {
    //   parsedProperties = JSON.parse(properties);
    // } catch (error) {
    //   throw httpErrors.BadRequest("Invalid properties format");
    // }

    // if (
    //   !Array.isArray(parsedProperties) ||
    //   parsedProperties.some((prop) => typeof prop !== "string")
    // ) {
    //   throw httpErrors.BadRequest("Properties must be an array of strings");
    // }
    const newSubCategory = new SubCategory({
      uuid: uuid(),
      title: title,
      properties: properties,
      category,
      isActive: true,
    });
    await newSubCategory.save();

    res.status(201).json({
      message: "SubCategory added successfully",
      data: newSubCategory,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = addSubCategory;
