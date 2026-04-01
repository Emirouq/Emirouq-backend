const httpErrors = require("http-errors");
const Category = require("../../models/Category.model");
const formidable = require("formidable");
const { v4: uuid } = require("uuid");
const { upload } = require("../../services/util/upload-files");

const uploadFilesToAws = async (files, folderName) => {
  const location = files?.path || files?.filepath;
  const originalFileName = files?.name || files?.originalFilename;
  const fileType = files?.type || files?.mimetype;
  const data = await upload(location, originalFileName, folderName, fileType);
  return {
    url: data?.Location,
    type: fileType,
    name: originalFileName,
    uuid: uuid(),
  };
};

const addCategory = async (req, res, next) => {
  try {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          throw httpErrors.BadRequest("Error parsing form data");
        }

        // const { title, properties } = fields;
        const { title, index } = fields;
        if (!title) {
          throw httpErrors.BadRequest("Title is required");
        }

        const existingTitleCategory = await Category.findOne({
          title: title[0],
        });
        if (existingTitleCategory) {
          throw httpErrors.Conflict("Category with this title already exists");
        }

        if (!index) {
          throw httpErrors.BadRequest("Index is required");
        }

        const categoryIndex = Number(index[0]);
        if (isNaN(categoryIndex)) {
          throw httpErrors.BadRequest("Index must be a valid number");
        }

        const existingIndexCategory = await Category.findOne({
          index: categoryIndex,
        });
        if (existingIndexCategory) {
          throw httpErrors.Conflict("Category with this index already exists");
        }

        // let parsedProperties;
        // try {
        //   parsedProperties = JSON.parse(properties[0]);
        // } catch (error) {
        //   throw httpErrors.BadRequest("Invalid properties format");
        // }

        // if (
        //   !Array.isArray(parsedProperties) ||
        //   parsedProperties.some((prop) => typeof prop !== "string")
        // ) {
        //   throw httpErrors.BadRequest("Properties must be an array of strings");
        // }

        let logo = null;
        if (files?.logo) {
          const uploadedFile = await uploadFilesToAws(
            files.logo[0],
            "categories",
          );
          logo = uploadedFile.url;
        }

        const newCategory = new Category({
          uuid: uuid(),
          title: title[0],
          index: categoryIndex,
          // properties: parsedProperties,
          logo,
          // isActive: true,
        });
        await newCategory.save();

        res.status(201).json({
          message: "Category added successfully",
          category: newCategory,
        });
      } catch (error) {
        return next(error);
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = addCategory;
