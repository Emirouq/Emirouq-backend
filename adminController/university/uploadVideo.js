const University = require("../../models/University.model");
const createHttpError = require("http-errors");
const formidable = require("formidable");
const { upload } = require("../../services/util/upload-files");
const { v4: uuid } = require("uuid");

/**
 * Login for existing users
 *
 * @author Areeb
 * @since 8 Jul 2023
 */
const uploadFilesToAws = async (files, folderName) => {
  const location = files?.path || files?.filepath;
  const originalFileName = files?.name || files?.originalFilename;
  const fileType = files?.type || files?.mimetype;
  const data = await upload(location, originalFileName, folderName, fileType);
  return {
    url: data?.Location,
    type: fileType,
  };
};
const thumbnail = async (files, folderName) => {
  sharp(req.file.path)
    .resize(200, 200)
    .toFile(
      "uploads/" + "thumbnails-" + files?.name || files?.originalFilename,
      (err, resizeImage) => {
        if (err) {
          console.log(err);
        } else {
          console.log(resizeImage, "resizeImage");
          return resizeImage;
        }
      }
    );
};
const uploadVideo = async (req, res, next) => {
  try {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          res.status(400);
          res.send(err);
        }
        const { id } = req.params;
        let { description, uploadType } = fields;
        description = description?.[0];
        uploadType = uploadType?.[0];
        let preview = [];
        const isSectionExist = await University.findOne({ uuid: id });
        if (!isSectionExist) {
          throw createHttpError(404, "Section not found");
        }
        // const thumbnailImage = await thumbnail(
        //   files,
        //   `university-${isSectionExist?.section}`
        // );

        if (files?.[uploadType]?.[0]) {
          preview = await uploadFilesToAws(
            files?.[uploadType]?.[0],
            `university-${isSectionExist?.section}`
          );
        }
        await University.findOneAndUpdate(
          {
            uuid: id,
          },
          {
            ...(uploadType &&
              description && {
                $addToSet: {
                  data: {
                    ...(preview && { preview }),
                    ...(description && { description }),
                    ...(preview && { thumbnail: preview }),
                  },
                },
              }),
          },
          { new: true }
        );
        return res.status(200).json({
          message: "",
          success: true,
        });
      } catch (err) {
        next(err);
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = uploadVideo;
