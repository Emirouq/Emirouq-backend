// const httpErrors = require("http-errors");
// const formidable = require("formidable");
// const { v4: uuid } = require("uuid");
// const { upload } = require("../../services/util/upload-files");
// const UserModel = require("../../models/User.model");

// const uploadFilesToAws = async (files, folderName) => {
//   const location = files?.path || files?.filepath;
//   const originalFileName = files?.name || files?.originalFilename;
//   const fileType = files?.type || files?.mimetype;
//   const data = await upload(location, originalFileName, folderName, fileType);
//   return {
//     url: data?.Location,
//     type: fileType,
//     name: originalFileName,
//     uuid: uuid(),
//   };
// };

// const updateProfile = async (req, res, next) => {
//   try {
//     const form = new formidable.IncomingForm();
//     form.parse(req, async (err, fields, files) => {
//       try {
//         if (err) {
//           throw httpErrors.BadRequest("Error parsing form data");
//         }

//         let { fullName, email, phoneNumber, userHandle, bio, userInterest } =
//           fields;
//         console.log("Updatefields", fields);
//         const { uuid: userId } = req.user;

//         if (email) email = email[0].trim().toLowerCase();
//         if (userHandle) userHandle = userHandle[0].trim().toLowerCase();

//         if (email) {
//           const userData = await UserModel.findOne({ email });
//           if (userData && userData.uuid !== userId) {
//             throw new httpErrors.Conflict("Email already exists");
//           }
//         }

//         if (userHandle) {
//           const existingUserHandle = await UserModel.findOne({ userHandle });
//           if (existingUserHandle && existingUserHandle.uuid !== userId) {
//             throw new httpErrors.Conflict("User Name already exists");
//           }
//         }
//         if (userInterest) {
//           try {
//             userInterest = JSON.parse(userInterest[0]);
//             if (
//               !Array.isArray(userInterest) ||
//               userInterest.some((item) => typeof item !== "string")
//             ) {
//               throw new Error();
//             }
//           } catch (error) {
//             throw httpErrors.BadRequest(
//               "Invalid userInterest format. It should be an array of strings."
//             );
//           }
//         }
//         let profileImage = null;
//         if (files?.profileImage) {
//           const uploadedFile = await uploadFilesToAws(
//             files.profileImage[0],
//             "profile"
//           );
//           profileImage = uploadedFile.url;
//         }

//         const user = await UserModel.findOneAndUpdate(
//           { uuid: userId },
//           {
//             ...(fullName && { fullName: fullName[0] }),
//             ...(phoneNumber && { phoneNumber: phoneNumber[0] }),
//             ...(email && { email }),
//             ...(userHandle && { userHandle }),
//             ...(profileImage && { profileImage }),
//             ...(bio && { bio: bio[0] }),
//             ...(userInterest && { userInterest }),
//           },
//           { new: true }
//         );

//         res.json({
//           message: "Updated successfully",
//           data: user,
//         });
//       } catch (error) {
//         next(error);
//       }
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// module.exports = updateProfile;
const httpErrors = require("http-errors");
const { v4: uuid } = require("uuid");
const uploadBase64File = require("../../services/util/upload-base64-file");
const UserModel = require("../../models/User.model");

const updateProfile = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      userHandle,
      bio,
      userInterest,
      profileImage,
    } = req.body;
    console.log("req.body", req.body);
    const { uuid: userId } = req.user;

    const sanitizedEmail = email?.trim().toLowerCase();
    const sanitizedUserHandle = userHandle?.trim().toLowerCase();

    if (sanitizedEmail) {
      const userData = await UserModel.findOne({ email: sanitizedEmail });
      if (userData && userData.uuid !== userId) {
        throw new httpErrors.Conflict("Email already exists");
      }
    }

    if (sanitizedUserHandle) {
      const existingUserHandle = await UserModel.findOne({
        userHandle: sanitizedUserHandle,
      });
      if (existingUserHandle && existingUserHandle.uuid !== userId) {
        throw new httpErrors.Conflict("User Name already exists");
      }
    }

    let parsedUserInterest = [];
    if (userInterest) {
      try {
        parsedUserInterest = JSON.parse(userInterest);
        if (
          !Array.isArray(parsedUserInterest) ||
          parsedUserInterest.some((item) => typeof item !== "string")
        ) {
          throw new Error();
        }
      } catch (error) {
        throw httpErrors.BadRequest(
          "Invalid userInterest format. It should be an array of strings."
        );
      }
    }

    let uploadedImageUrl = null;
    if (profileImage) {
      uploadedImageUrl = await uploadBase64File(profileImage, "profile");
    }
    console.log("uploadedImageUrl", uploadedImageUrl);
    const updatedUser = await UserModel.findOneAndUpdate(
      { uuid: userId },
      {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phoneNumber && { phoneNumber }),
        ...(sanitizedEmail && { email: sanitizedEmail }),
        ...(sanitizedUserHandle && { userHandle: sanitizedUserHandle }),
        ...(uploadedImageUrl && { profileImage: uploadedImageUrl?.Location }),
        ...(bio && { bio }),
        ...(parsedUserInterest.length > 0 && {
          userInterest: parsedUserInterest,
        }),
      },
      { new: true }
    );

    res.json({
      message: "Updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updateProfile;
