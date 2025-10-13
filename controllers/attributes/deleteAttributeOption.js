const AttributeOption = require("../../models/AttributeOption.model");

const deleteAttributeOption = async (req, res, next) => {
  try {
    const { attributeOptionId } = req.params;
    if (!attributeOptionId) {
      return res.status(400).json({
        message: "AttributeId id is required",
        success: false,
      });
    }

    const findAttributeOption = await AttributeOption.findOne({
      uuid: attributeOptionId,
    });
    if (!findAttributeOption) {
      throw new Error("Not found");
    }

    await AttributeOption.findOneAndDelete({
      uuid: attributeOptionId,
    });
    const findParent = await AttributeOption.findOne({
      parentId: attributeOptionId,
    });
    //if parent finds, then delete rest options
    if (findParent) {
      await AttributeOption.deleteMany({
        parentId: attributeOptionId,
      });
    }
    res.status(200).json({
      message: "Deleted Successfully",
      success: true,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = deleteAttributeOption;
