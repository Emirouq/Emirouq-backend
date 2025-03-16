const httpErrors = require("http-errors");
const formidable = require("formidable");
const { v4: uuid } = require("uuid");
const { upload } = require("../../services/util/upload-files");
const UserModel = require("../../models/User.model");

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

const updateProfile = async (req, res, next) => {
  try {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          throw httpErrors.BadRequest("Error parsing form data");
        }

        let { fullName, email, phoneNumber, userHandle, bio, userInterest } =
          fields;
        console.log("Updatefields", fields);
        const { uuid: userId } = req.user;

        if (email) email = email[0].trim().toLowerCase();
        if (userHandle) userHandle = userHandle[0].trim().toLowerCase();

        if (email) {
          const userData = await UserModel.findOne({ email });
          if (userData && userData.uuid !== userId) {
            throw new httpErrors.Conflict("Email already exists");
          }
        }

        if (userHandle) {
          const existingUserHandle = await UserModel.findOne({ userHandle });
          if (existingUserHandle && existingUserHandle.uuid !== userId) {
            throw new httpErrors.Conflict("User Name already exists");
          }
        }
        if (userInterest) {
          try {
            userInterest = JSON.parse(userInterest[0]);
            if (
              !Array.isArray(userInterest) ||
              userInterest.some((item) => typeof item !== "string")
            ) {
              throw new Error();
            }
          } catch (error) {
            throw httpErrors.BadRequest(
              "Invalid userInterest format. It should be an array of strings."
            );
          }
        }
        let profileImage = null;
        if (files?.profileImage) {
          const uploadedFile = await uploadFilesToAws(
            files.profileImage[0],
            "profile"
          );
          profileImage = uploadedFile.url;
        }

        const user = await UserModel.findOneAndUpdate(
          { uuid: userId },
          {
            ...(fullName && { fullName: fullName[0] }),
            ...(phoneNumber && { phoneNumber: phoneNumber[0] }),
            ...(email && { email }),
            ...(userHandle && { userHandle }),
            ...(profileImage && { profileImage }),
            ...(bio && { bio: bio[0] }),
            ...(userInterest && { userInterest }),
          },
          { new: true }
        );

        res.json({
          message: "Updated successfully",
          data: user,
        });
      } catch (error) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updateProfile;
