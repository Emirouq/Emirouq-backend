const httpErrors = require("http-errors");
const Post = require("../../models/Post.model");
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

const addPost = async (req, res, next) => {
  try {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          throw httpErrors.BadRequest("Error parsing form data");
        }

        const { title, description, price, timePeriod, location, condition } =
          fields;
        const { id: subCategory } = req.params;

        if (!title) throw httpErrors.BadRequest("Title is required");
        if (!description)
          throw httpErrors.BadRequest("Description is required");
        if (!subCategory)
          throw httpErrors.BadRequest("Subcategory ID is required");

        let parsedProperties = [];
        console.log(11, fields.properties);
        if (fields.properties) {
          try {
            parsedProperties = JSON.parse(fields.properties[0]).map((prop) => {
              if (!prop.name || !prop.value) {
                throw httpErrors.BadRequest(
                  "Each property must have a name and value"
                );
              }
              return { name: prop.name, value: prop.value };
            });
          } catch (error) {
            throw httpErrors.BadRequest("Invalid properties format");
          }
        }

        if (!Array.isArray(parsedProperties)) {
          throw httpErrors.BadRequest(
            "Properties must be an array of objects with name and value"
          );
        }

        let img = null;
        if (files?.img) {
          const uploadedFile = await uploadFilesToAws(files.img[0], "posts");
          img = uploadedFile.url;
        }

        const newPost = new Post({
          uuid: uuid(),
          title: title[0],
          description: description[0],
          ...(price && { price: price[0] }),
          ...(img && { img }),
          subCategory,
          ...(parsedProperties.length > 0 && { properties: parsedProperties }),
          ...(timePeriod && { timePeriod: timePeriod[0] }),
          ...(location && { location: location[0] }),
          ...(condition && { condition: condition[0] }),
        });
        await newPost.save();

        res.status(201).json({
          message: "Post added successfully",
          data: newPost,
        });
      } catch (error) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = addPost;
