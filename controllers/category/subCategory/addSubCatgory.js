const httpErrors = require("http-errors");
const SubCategory = require("../../../models/SubCategory.model");
const Attribute = require("../../../models/Attribute.model");
const { v4: uuid } = require("uuid");
const uploadBase64File = require("../../../services/util/upload-base64-file");

const addSubCategory = async (req, res, next) => {
  try {
    const { title, properties, image } = req.body;
    const { categoryId } = req.params;
    if (!title) {
      throw httpErrors.BadRequest("Title is required");
    }
    if (!categoryId) {
      throw httpErrors.BadRequest("Category is required");
    }
    console.log("properties", properties);

    let logo = null;
    if (image) {
      const uploadedFile = await uploadBase64File(
        { base64: image, fileName: title },
        "sub-category"
      );
      logo = uploadedFile.Location;
    }

    const newSubCategory = new SubCategory({
      uuid: uuid(),
      title: title,
      category: categoryId,
      isActive: true,
      logo,
    });

    for (const prop of properties) {
      const { label, filterType, order, visibleInFilter, dependsOn } = prop;
      const newAttribute = new Attribute({
        uuid: uuid(),
        label,
        filterType,
        order,
        visibleInFilter,
        subCategory: newSubCategory.uuid,
        category: categoryId,
        dependsOn,
      });
      await newAttribute.save();
      newSubCategory.properties.push(newAttribute.uuid);
    }
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
