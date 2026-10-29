const AttributeOption = require("../../models/AttributeOption.model");
const Attribute = require("../../models/Attribute.model");
const { v4: uuid } = require("uuid");
const httpErrors = require("http-errors");
const {
  cleanValue,
  sameValueRegex,
} = require("../../helpers/masterDataDuplicates");
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
    const cleaned = cleanValue(value);
    if (!cleaned) {
      throw httpErrors.BadRequest("Value is required");
    }

    // A child value (e.g. a Model) needs a real parent value (its Brand).
    let parent = null;
    if (parentId) {
      parent = await AttributeOption.findOne({ uuid: parentId }).lean();
      if (!parent) throw httpErrors.BadRequest("Parent value not found");
    }

    // Same value under the same parent counts as a duplicate, ignoring case
    // and extra spaces ("Toyota" = "toyota ").
    const duplicate = await AttributeOption.exists({
      attributeId,
      ...(parent ? { parentId: parent.uuid } : { parentId: { $in: [null, ""] } }),
      value: sameValueRegex(cleaned),
    });
    if (duplicate) {
      throw httpErrors.Conflict(
        parent
          ? `"${cleaned}" already exists under "${parent.value}"`
          : `"${cleaned}" already exists`
      );
    }

    await AttributeOption.create({
      uuid: uuid(),
      value: cleaned,
      attributeId, // eg: brand or model uuid
      ...(parent && { parentId: parent.uuid, parentValue: parent.value }),
    });

    await res.status(200).json({
      message: "Added Successfully",
      success: true,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = addAttributeOptions;
