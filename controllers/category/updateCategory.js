const httpErrors = require("http-errors");
const Category = require("../../models/Category.model");
const formidable = require("formidable");
const { upload } = require("../../services/util/upload-files");

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw httpErrors.BadRequest("Category ID is required");
    }

    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          return next(httpErrors.BadRequest("Error parsing form data"));
        }

        const { title, index } = fields;
        let updateData = {};
        let categoryToSwap = null;
        let categoryIndex = null;

        const category = await Category.findOne({ uuid: id });
        if (!category) {
          throw httpErrors.NotFound("Category not found");
        }

        if (title) {
          const categoryTitle = title[0]?.trim();
          if (!categoryTitle) {
            throw httpErrors.BadRequest("Title cannot be empty");
          }

          const existingTitleCategory = await Category.findOne({
            title: categoryTitle,
            uuid: { $ne: id },
          });
          if (existingTitleCategory) {
            throw httpErrors.Conflict("Category with this title already exists");
          }

          updateData.title = categoryTitle;
        }

        if (index) {
          categoryIndex = Number(index[0]);
          if (!index[0] || isNaN(categoryIndex)) {
            throw httpErrors.BadRequest("Index must be a valid number");
          }

          if (categoryIndex !== category.index) {
            const existingIndexCategory = await Category.findOne({
              index: categoryIndex,
              uuid: { $ne: id },
            });

            categoryToSwap = existingIndexCategory;

            updateData.index = categoryIndex;
          }
        }

        // if (properties) {
        //   try {
        //     const parsedProperties = JSON.parse(properties[0]);
        //     if (
        //       !Array.isArray(parsedProperties) ||
        //       parsedProperties.some((prop) => typeof prop !== "string")
        //     ) {
        //       throw new Error();
        //     }
        //     updateData.properties = parsedProperties;
        //   } catch {
        //     throw httpErrors.BadRequest(
        //       "Invalid properties format. It must be an array of strings."
        //     );
        //   }
        // }

        if (files?.logo) {
          const uploadedFile = await upload(
            files.logo[0].filepath,
            files.logo[0].originalFilename,
            "categories",
            files.logo[0].mimetype,
          );
          updateData.logo = uploadedFile.Location;
        }

        let updatedCategory;

        if (categoryToSwap) {
          const tempIndex = -Date.now();

          await Category.updateOne(
            { uuid: id },
            { $set: { ...updateData, index: tempIndex } },
          );

          await Category.updateOne(
            { uuid: categoryToSwap.uuid },
            { $set: { index: category.index } },
          );

          updatedCategory = await Category.findOneAndUpdate(
            { uuid: id },
            { $set: { index: categoryIndex } },
            { new: true },
          );
        } else {
          updatedCategory = await Category.findOneAndUpdate(
            { uuid: id },
            updateData,
            { new: true },
          );
        }

        res.status(200).json({
          message: "Category updated successfully",
          swappedCategory: categoryToSwap?.uuid || null,
          category: updatedCategory,
        });
      } catch (error) {
        return next(error);
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updateCategory;
