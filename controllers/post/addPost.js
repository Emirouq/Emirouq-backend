const httpErrors = require("http-errors");
const Post = require("../../models/Post.model");
const formidable = require("formidable");
const { v4: uuid } = require("uuid");
const { upload } = require("../../services/util/upload-files");
const { accessChecker } = require("../../middlewares/access_checker");
const UserSubscription = require("../../models/UserSubscription.model");

const uploadFilesToAws = async (files, folderName) => {
  const location = files?.path || files?.filepath;
  const originalFileName = files?.name || files?.originalFilename;
  const fileType = files?.type || files?.mimetype;
  const data = await upload(location, originalFileName, folderName, fileType);
  return data?.Location;
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
      condition,
      isDraft,
      category,
      subCategory,
      locationName,
      locationPlaceId,
      location,
    } = fields;

    if (location && location[0]) {
      const raw = location[0]; // "\"{...}\""
      const once = JSON.parse(raw); // "{...}"  ← still a string
      location = JSON.parse(once); // { name: "...", placeId: "...", ... }
    }

    const { uuid: userId } = req.user;

    const draftMode = isDraft?.[0];

    //to check for the access of the user to create a post.
    const subscription = await UserSubscription.findOne({
      user: userId,
      status: "active",
      "subscriptionPlan.categoryId": category?.[0],
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
        const parsed = JSON.parse(fields.properties[0]);
        parsedProperties = parsed?.map((prop) => {
          if (!prop.label || !prop.selectedValue) {
            throw httpErrors.BadRequest(
              "Each property must have a name and value"
            );
          }
          return prop;
        });
      } catch (error) {
        throw httpErrors.BadRequest(
          error?.message || "Invalid properties format"
        );
      }
    }

    let uploadedFiles = [];
    // if (files?.file) {
    //   const receivedFiles = Array.isArray(files.file)
    //     ? files.file
    //     : [files.file];
    //   uploadedFiles = await uploadFilesToAws(receivedFiles, "posts");
    // }
    if (files?.image?.length) {
      uploadedFiles = await Promise.all(
        files?.image?.map((file) => uploadFilesToAws(file, `posts/${userId}`))
      );
    }
    const categorySubscription = await UserSubscription.findOne({
      user: userId,
      status: "active",
      "subscriptionPlan.categoryId": category?.[0],
    });
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
      ...(locationName && {
        location: {
          name: locationName?.[0],
          placeId: locationPlaceId[0],
          ...location,
        },
      }),
      geometry: {
        type: "Point",
        coordinates: [location.lng, location.lat],
      },
      ...(condition && { condition: condition[0] }),
      file: uploadedFiles,
      expirationDate: !draftMode ? endDate : null,
      adType: subscription?.uuid ? "paid" : "free",
      ...(categorySubscription && {
        subscriptionId: categorySubscription?.subscriptionId,
      }),
    });

    await newPost.save();
    console.log(newPost, "newPost");

    res.status(201).json({
      message: draftMode ? "Post saved as draft" : "Post added successfully",
      data: newPost,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = addPost;
