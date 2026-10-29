const httpErrors = require("http-errors");
const SubCategory = require("../../../models/SubCategory.model");
const Attribute = require("../../../models/Attribute.model");
const { v4: uuid } = require("uuid");
const uploadBase64File = require("../../../services/util/upload-base64-file");
const {
  cleanValue,
  normalizeValue,
  sameValueRegex,
} = require("../../../helpers/masterDataDuplicates");
/** Rejects attribute labels repeated within one request (case-insensitive). */
const assertUniqueLabels = (labels) => {
  const seen = new Set();
  for (const label of labels) {
    const key = normalizeValue(label);
    if (!key) continue;
    if (seen.has(key)) {
      throw httpErrors.Conflict(`Attribute "${cleanValue(label)}" is listed twice`);
    }
    seen.add(key);
  }
};


const updateSubCategory = async (req, res, next) => {
  try {
    const { subCategoryId, categoryId } = req.params;
    if (!subCategoryId) {
      throw httpErrors.BadRequest("SubCategory ID is required");
    }

    const { title, properties, deletedProperties, image } = req.body;

    // Find the subcategory
    const subCategory = await SubCategory.findOne({
      uuid: subCategoryId,
      category: categoryId,
    });

    if (!subCategory) {
      throw httpErrors.NotFound("SubCategory not found");
    }

    // Update title if provided
    if (title) {
      if (
        await SubCategory.exists({
          uuid: { $ne: subCategoryId },
          category: categoryId,
          title: sameValueRegex(title),
        })
      ) {
        throw httpErrors.Conflict(
          `Sub-category "${cleanValue(title)}" already exists in this category`
        );
      }
      subCategory.title = cleanValue(title);
    }

    // Attribute labels stay unique within the sub-category: across the
    // request, and against attributes that are kept.
    if (properties && Array.isArray(properties)) {
      assertUniqueLabels(properties.map((prop) => prop?.label));
      const editedIds = properties.map((prop) => prop?.uuid).filter(Boolean);
      const kept = await Attribute.find({
        subCategory: subCategoryId,
        uuid: { $nin: [...editedIds, ...(deletedProperties || [])] },
      })
        .select("label")
        .lean();
      const keptLabels = new Set(kept.map((attr) => normalizeValue(attr.label)));
      const clash = properties.find(
        (prop) => !prop?.uuid && keptLabels.has(normalizeValue(prop?.label))
      );
      if (clash) {
        throw httpErrors.Conflict(
          `Attribute "${cleanValue(clash.label)}" already exists in this sub-category`
        );
      }
    }

    // Delete properties if provided
    if (
      deletedProperties &&
      Array.isArray(deletedProperties) &&
      deletedProperties.length
    ) {
      // Remove from subCategory properties array
      subCategory.properties = subCategory.properties.filter(
        (propUuid) => !deletedProperties.includes(propUuid)
      );

      // Remove Attribute documents
      await Attribute.deleteMany({ uuid: { $in: deletedProperties } });
    }

    // Add or update properties
    if (properties && Array.isArray(properties)) {
      for (const prop of properties) {
        const {
          uuid: propUuid,
          label,
          filterType,
          order,
          visibleInFilter,
          dependsOn,
        } = prop;

        if (propUuid) {
          // Update existing attribute
          await Attribute.findOneAndUpdate(
            { uuid: propUuid },
            { label, filterType, order, visibleInFilter, dependsOn }
          );
        } else {
          // Create new attribute
          const newAttribute = new Attribute({
            uuid: uuid(),
            label,
            filterType,
            order,
            visibleInFilter,
            subCategory: subCategory.uuid,
            category: categoryId,
            dependsOn,
          });
          await newAttribute.save();
          subCategory.properties.push(newAttribute.uuid);
        }
      }
    }

    if (image) {
      const uploadedFile = await uploadBase64File(
        { base64: image, fileName: title },
        "sub-category"
      );
      subCategory.logo = uploadedFile.Location;
    }
    // Save the updated subcategory
    await subCategory.save();

    res.status(200).json({
      message: "SubCategory updated successfully",
      data: subCategory,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updateSubCategory;
