const httpErrors = require("http-errors");
const Category = require("../../models/Category.model");
const formidable = require("formidable");
const { upload } = require("../../services/util/upload-files");

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log("id", id);
    if (!id) {
      throw httpErrors.BadRequest("Category ID is required");
    }

    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          throw httpErrors.BadRequest("Error parsing form data");
        }

        const { title } = fields;
        console.log("fields", fields);
        let updateData = {};

        if (title) updateData.title = title[0];

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
            files.logo[0].mimetype
          );
          updateData.logo = uploadedFile.Location;
        }

        const updatedCategory = await Category.findOneAndUpdate(
          { uuid: id },
          updateData,
          { new: true }
        );

        if (!updatedCategory) {
          throw httpErrors.NotFound("Category not found");
        }

        res.status(200).json({
          message: "Category updated successfully",
          category: updatedCategory,
        });
      } catch (error) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updateCategory;
