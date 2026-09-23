const httpErrors = require("http-errors");
const Post = require("../../models/Post.model");
const formidable = require("formidable");
const { upload } = require("../../services/util/upload-files");
const {
  notifyFavoriteItemUpdated,
  notifyFavoritePriceDrop,
} = require("../../services/notification/favoriteNotifications");
const {
  assertCanPublishInCategory,
} = require("../../helpers/subscriptionAccess");

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
const updatePost = async (req, res, next) => {
  try {
    const { id: postId } = req.params;
    const { uuid: userId } = req.user;

    try {
      const { fields, files } = await parseForm(req);

      const existingPost = await Post.findOne({ uuid: postId, userId });
      if (!existingPost) {
        throw httpErrors.NotFound("Post not found");
      }
      const oldPrice = existingPost.price;

      let {
        title,
        description,
        price,
        timePeriod,
        locationName,
        locationPlaceId,
        condition,
        isDraft,
        location,
      } = fields;
      const draftMode = isDraft?.[0];

      if (location && location[0]) {
        const raw = location[0]; // "\"{...}\""
        const once = JSON.parse(raw); // "{...}"  ← still a string
        location = JSON.parse(once); // { name: "...", placeId: "...", ... }
      }

      let subscription = null;
      let endDate;

      if (!draftMode) {
        if (!title) throw httpErrors.BadRequest("Title is required");
        if (!description)
          throw httpErrors.BadRequest("Description is required");

        // This route had no subscription check at all, so "save as draft" and
        // then publish was a complete bypass of the paywall. A post that is
        // already live and paid for keeps its own subscription; anything that
        // is becoming live now has to be entitled.
        const isAlreadyLive =
          existingPost.status === "active" &&
          !existingPost.isExpired &&
          Boolean(existingPost.subscriptionId);

        if (!isAlreadyLive) {
          ({ subscription, endDate } = await assertCanPublishInCategory(
            userId,
            existingPost.category,
          ));
        }
      }

      let parsedProperties = [];
      if (fields.properties) {
        try {
          const parsed = JSON.parse(fields.properties[0]);
          parsedProperties = parsed?.map((prop) => {
            if (!prop.label || !prop.selectedValue) {
              throw httpErrors.BadRequest(
                "Each property must have a name and value",
              );
            }
            return prop;
          });
        } catch (error) {
          throw httpErrors.BadRequest("Invalid properties format");
        }
      }

      let uploadedFiles = [];
      // Step 1: Get existing URLs from `fields.uploadedUrls`
      if (fields?.uploadedUrls?.[0]) {
        try {
          const parsedUrls = JSON.parse(fields.uploadedUrls[0]);
          if (Array.isArray(parsedUrls)) {
            uploadedFiles.push(...parsedUrls);
          }
        } catch (err) {
          throw httpErrors.BadRequest("Invalid uploadedUrls format");
        }
      }

      // Step 2: Upload new images from `files.image`
      if (files?.image) {
        const imageFiles = Array.isArray(files.image)
          ? files.image
          : [files.image];
        const uploaded = await Promise.all(
          imageFiles.map((file) =>
            uploadFilesToAws([file], `posts/${userId}`).then((res) => res[0]),
          ),
        );

        uploadedFiles.push(...uploaded);
      }

      // Save to DB
      existingPost.file = uploadedFiles;

      existingPost.title = title?.[0] || existingPost.title;
      existingPost.description = description?.[0] || existingPost.description;
      existingPost.price = price?.[0] || existingPost.price;
      existingPost.timePeriod = timePeriod?.[0] || existingPost.timePeriod;
      existingPost.location = {
        name: locationName?.[0] || existingPost.location?.name,
        placeId: locationPlaceId?.[0] || existingPost.location?.placeId,
        ...location,
      };
      existingPost.geometry = {
        type: "Point",
        coordinates: [location.lng, location.lat],
      };
      existingPost.condition = condition?.[0] || existingPost.condition;
      existingPost.properties =
        parsedProperties.length > 0
          ? parsedProperties
          : existingPost.properties;
      // existingPost.file = uploadedFiles;
      existingPost.isDraft = draftMode;
      existingPost.status = draftMode ? "draft" : "pending";

      if (subscription?.subscriptionId) {
        // Stamp the same fields addPost does, otherwise a published draft had
        // no subscriptionId, counted as a free ad and never expired.
        existingPost.subscriptionId = subscription.subscriptionId;
        existingPost.adType = "paid";
        existingPost.isExpired = false;
        if (endDate) {
          existingPost.expirationDate = endDate;
        }
      }

      await existingPost.save();
      await notifyFavoritePriceDrop(existingPost, oldPrice);
      if (
        oldPrice == null ||
        existingPost.price == null ||
        Number(existingPost.price) >= Number(oldPrice)
      ) {
        await notifyFavoriteItemUpdated(existingPost);
      }

      res.status(200).json({
        message: draftMode
          ? "Post updated as draft"
          : "Post published successfully",
        data: existingPost,
      });
    } catch (error) {
      return next(error);
    }
  } catch (error) {
    next(error);
  }
};

module.exports = updatePost;
