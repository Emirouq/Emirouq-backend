const httpErrors = require("http-errors");
const SubCategory = require("../../../models/SubCategory.model");
const Attribute = require("../../../models/Attribute.model");
const { v4: uuid } = require("uuid");

const updateSubCategory = async (req, res, next) => {
  try {
    const { subCategoryId, categoryId } = req.params;
    if (!subCategoryId) {
      throw httpErrors.BadRequest("SubCategory ID is required");
    }

    const { title, properties, deletedProperties } = req.body;

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
      subCategory.title = title;
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
