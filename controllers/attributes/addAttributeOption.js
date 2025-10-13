const AttributeOption = require("../../models/AttributeOption.model");
const Attribute = require("../../models/Attribute.model");
const { v4: uuid } = require("uuid");
const addAttributeOptions = async (req, res, next) => {
  try {
    const { attributeId } = req.params;
    const { value, parentId, parentValue } = req.body;
    if (!attributeId) {
      return res.status(400).json({
        message: "AttributeId id is required",
        success: false,
      });
    }

    const findAttribute = await Attribute.findOne({
      uuid: attributeId,
    });
    if (!findAttribute) {
      throw new Error("Not found");
    }
    // if the main attribute is adding then create
    if (!parentId) {
      await AttributeOption.create({
        uuid: uuid(),
        value,
        attributeId, // eg: brand uuid
      });
    }
    if (parentId && parentValue) {
      await AttributeOption.create({
        uuid: uuid(),
        value,
        attributeId, // eg: model uuid
        parentId,
        parentValue,
      });
    }
    // else add children

    await res.status(200).json({
      message: "Added Successfully",
      success: true,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = addAttributeOptions;
