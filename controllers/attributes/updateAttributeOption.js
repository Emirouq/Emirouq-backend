const AttributeOption = require("../../models/AttributeOption.model");

const updateAttributeOption = async (req, res, next) => {
  try {
    const { attributeOptionId } = req.params;
    const { value } = req.body;
    if (!attributeOptionId) {
      return res.status(400).json({
        message: "AttributeId id is required",
        success: false,
      });
    }
    if (!value) {
      throw new Error("Value is Required");
    }

    const findAttributeOption = await AttributeOption.findOne({
      uuid: attributeOptionId,
    });
    if (!findAttributeOption) {
      throw new Error("Not found");
    }

    await AttributeOption.findOneAndUpdate(
      {
        uuid: attributeOptionId,
      },
      {
        $set: {
          value,
        },
      }
    );
    const findParent = await AttributeOption.findOne({
      parentId: attributeOptionId,
    });
    //if parent finds, then update rest options
    if (findParent) {
      await AttributeOption.updateMany(
        {
          parentId: attributeOptionId,
        },
        {
          $set: {
            parentValue: value,
          },
        }
      );
    }
    res.status(200).json({
      message: "Update Successfully",
      success: true,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = updateAttributeOption;
