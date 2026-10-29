const httpErrors = require("http-errors");
const AttributeOption = require("../../models/AttributeOption.model");
const {
  cleanValue,
  sameValueRegex,
} = require("../../helpers/masterDataDuplicates");

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
    const cleaned = cleanValue(value);
    if (!cleaned) {
      throw httpErrors.BadRequest("Value is Required");
    }

    const findAttributeOption = await AttributeOption.findOne({
      uuid: attributeOptionId,
    });
    if (!findAttributeOption) {
      throw httpErrors.NotFound("Not found");
    }

    const duplicate = await AttributeOption.exists({
      uuid: { $ne: attributeOptionId },
      attributeId: findAttributeOption.attributeId,
      ...(findAttributeOption.parentId
        ? { parentId: findAttributeOption.parentId }
        : { parentId: { $in: [null, ""] } }),
      value: sameValueRegex(cleaned),
    });
    if (duplicate) {
      throw httpErrors.Conflict(`"${cleaned}" already exists`);
    }

    await AttributeOption.findOneAndUpdate(
      {
        uuid: attributeOptionId,
      },
      {
        $set: {
          value: cleaned,
        },
      },
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
            parentValue: cleaned,
          },
        },
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
