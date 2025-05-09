const httpErrors = require("http-errors");
const Post = require("../../models/Post.model");
const formidable = require("formidable");
const { v4: uuid } = require("uuid");
const { upload } = require("../../services/util/upload-files");
const { accessChecker } = require("../../middlewares/access_checker");
const UserSubscription = require("../../models/UserSubscription.model");

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
const parseForm = (req) =>
  new Promise((resolve, reject) => {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err);
      }
      resolve({ fields, files });
    });
  });

const addPost = async (req, res, next) => {
  try {
    const { fields, files } = await parseForm(req);

    let {
      title,
      description,
      price,
      timePeriod,
      location,
      condition,
      isDraft,
      category,
      subCategory,
      locationName,
      locationPlaceId,
    } = fields;
    console.log("fields", fields);
    const { uuid: userId } = req.user;

    const draftMode = isDraft?.[0];

    //to check for the access of the user to create a post.
    const subscription = await UserSubscription.findOne({
      user: userId,
      status: "active",
    });
    let endDate;
    if (!draftMode) {
      if (!title) throw httpErrors.BadRequest("Title is required");
      if (!description) throw httpErrors.BadRequest("Description is required");
      if (!subCategory)
        throw httpErrors.BadRequest("Subcategory Id is required");
      if (!category) throw httpErrors.BadRequest("Category Id is required");

      try {
        ({ endDate } = await accessChecker(userId, subscription));
      } catch (error) {
        throw httpErrors.Forbidden(error?.message);
      }
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

    let uploadedFiles = [];
    if (files?.file) {
      const receivedFiles = Array.isArray(files.file)
        ? files.file
        : [files.file];
      uploadedFiles = await uploadFilesToAws(receivedFiles, "posts");
    }
    const newPost = new Post({
      uuid: uuid(),
      status: !!draftMode === true ? "draft" : "pending",
      userId,
      title: title?.[0] || null,
      description: description?.[0] || null,
      ...(price && { price: price[0] }),
      subCategory: subCategory?.[0] || null,
      category: category?.[0] || null,
      ...(parsedProperties.length > 0 && { properties: parsedProperties }),
      ...(timePeriod && { timePeriod: timePeriod[0] }),
      ...(location && {
        location: {
          name: locationName?.[0],
          placeId: locationPlaceId[0],
        },
      }),
      ...(condition && { condition: condition[0] }),
      file: uploadedFiles,
      expirationDate: !draftMode ? endDate : null,
      adType: subscription?.uuid ? "paid" : "free",
    });

    await newPost.save();

    res.status(201).json({
      message: draftMode ? "Post saved as draft" : "Post added successfully",
      data: newPost,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = addPost;
