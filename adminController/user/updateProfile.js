const AdminModel = require("../../models/Admin.model");
const User = require("../../models/User.model");
const uploadBase64File = require("../../services/util/upload-base64-file");

const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, email, profile } = req.body;
    const { uuid: userId } = req.user;
    let profileImage;
    if (profile?.base64) {
      profileImage = await uploadBase64File(profile, "profile");
    }

    const user = await AdminModel.findOneAndUpdate(
      {
        uuid: userId,
      },
      {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email: email.toLowerCase() }),
        ...(profileImage?.Location && { profileImage: profileImage.Location }),
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
};

module.exports = updateProfile;
