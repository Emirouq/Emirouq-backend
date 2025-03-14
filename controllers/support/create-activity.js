const SupportActivity = require("../../models/SupportActivity.model");
const SupportTicket = require("../../models/SupportTicket.model");
const formidable = require("formidable");
const { v4: uuid } = require("uuid");
const { upload } = require("../../services/util/upload-files");
const dayjs = require("dayjs");

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
const createActivity = async (req, res, next) => {
  try {
    const form = new formidable.IncomingForm();
    const { uuid: user } = req.user;
    const { supportId } = req.params;
    const support = await SupportTicket.findOne({ uuid: supportId });
    if (!support) {
      throw new Error("Support ticket not found");
    }
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          throw new Error(err);
        }
        let { message } = fields;
        message = message?.[0];

        let attachments = [];
        if (files?.attachments?.length) {
          attachments = await Promise.all(
            files?.attachments?.map((file) =>
              uploadFilesToAws(file, `support/activity/${user}`)
            )
          );
        }

        const activity = new SupportActivity({
          uuid: uuid(),
          userType: "customer",
          user,
          supportId,
          message,
          ...(attachments?.length && { attachments }),
        });
        support.lastMessageTime = dayjs().unix();

        // 1. Update lastViewedTime for the current user
        // 2. Increment count for all other users except the current user
        // 3: Since we cannot use the same field in the same update operation in arrayFilters (it supports only one field), we have to do it in two separate operations
        await Promise.all([
          SupportTicket.findOneAndUpdate(
            { uuid: supportId },
            {
              $set: {
                "participants.$[elem].lastViewedTime": dayjs().unix(),
                lastMessageTime: dayjs().unix(),
              },
            },
            {
              new: true,
              arrayFilters: [{ "elem.user": user }],
            }
          ),
          SupportTicket.findOneAndUpdate(
            { uuid: supportId },
            {
              $inc: {
                "participants.$[otherUser].count": 1,
              },
            },
            {
              new: true,
              arrayFilters: [{ "otherUser.user": { $ne: user } }],
            }
          ),
        ]);
        await activity.save();

        res.status(200).json({
          message: "Activity created successfully",
        });
      } catch (error) {
        throw new Error(error);
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = createActivity;
