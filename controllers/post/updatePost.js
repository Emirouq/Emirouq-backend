const httpErrors = require("http-errors");
const Post = require("../../models/Post.model");
const formidable = require("formidable");
const { upload } = require("../../services/util/upload-files");

const uploadFilesToAws = async (files, folderName) => {
  const uploadedFiles = [];

  for (const file of files) {
    const location = file.path || file.filepath;
    const originalFileName = file.name || file.originalFilename;
    const fileType = file.type || file.mimetype;

    const data = await upload(location, originalFileName, folderName, fileType);
    uploadedFiles.push(data?.Location);
  }

  return uploadedFiles;
};

const updatePost = async (req, res, next) => {
  try {
    const { id: postId } = req.params;
    const { uuid: userId } = req.user;
    console.log(1, postId, userId);
    const form = new formidable.IncomingForm();
    form.multiples = true;

    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          throw httpErrors.BadRequest("Error parsing form data");
        }

        const existingPost = await Post.findOne({ uuid: postId, userId });
        if (!existingPost) {
          throw httpErrors.NotFound("Post not found");
        }

        const {
          title,
          description,
          price,
          timePeriod,
          location,
          condition,
          isDraft,
        } = fields;
        const draftMode = isDraft?.[0];
        console.log(11, draftMode);
        if (!draftMode) {
          if (!title) throw httpErrors.BadRequest("Title is required");
          if (!description)
            throw httpErrors.BadRequest("Description is required");
        }

        let parsedProperties = [];
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

        let uploadedFiles = existingPost.file || [];
        console.log("uploaded files", uploadedFiles);
        console.log("files", files);
        if (files?.file) {
          const receivedFiles = Array.isArray(files.file)
            ? files.file
            : [files.file];
          uploadedFiles = await uploadFilesToAws(receivedFiles, "posts");
        }

        existingPost.title = title?.[0] || existingPost.title;
        existingPost.description = description?.[0] || existingPost.description;
        existingPost.price = price?.[0] || existingPost.price;
        existingPost.timePeriod = timePeriod?.[0] || existingPost.timePeriod;
        existingPost.location = location?.[0] || existingPost.location;
        existingPost.condition = condition?.[0] || existingPost.condition;
        existingPost.properties =
          parsedProperties.length > 0
            ? parsedProperties
            : existingPost.properties;
        existingPost.file = uploadedFiles;
        existingPost.isDraft = draftMode;

        await existingPost.save();

        res.status(200).json({
          message: draftMode
            ? "Post updated as draft"
            : "Post published successfully",
          data: existingPost,
        });
      } catch (error) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updatePost;
