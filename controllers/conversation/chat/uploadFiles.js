const Chat = require("../../../models/Chat.model");
const formidable = require("formidable");
const { v4: uuid } = require("uuid");
const { upload } = require("../../../services/util/upload-files");

const uploadFilesToAws = async (files, folderName) => {
  const location = files?.path || files?.filepath;
  const originalFileName = files?.name || files?.originalFilename;
  const fileType = files?.type || files?.mimetype;
  const data = await upload(location, originalFileName, folderName, fileType);
  return {
    uri: data?.Location,
    type: fileType,
    name: originalFileName,
    uuid: uuid(),
  };
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

const uploadFiles = async (req, res, next) => {
  try {
    const { fields, files } = await parseForm(req);

    const { conversationId } = req.params;
    const { uuid: user } = req.user;
    let attachments = [];
    let audio = {};
    if (files?.image?.length) {
      attachments = await Promise.all(
        files?.image?.map((file) =>
          uploadFilesToAws(file, `chat/${conversationId}`)
        )
      );
    }
    if (files?.audio?.length) {
      [audio] = await Promise.all(
        files?.audio?.map((file) =>
          uploadFilesToAws(file, `chat/${conversationId}`)
        )
      );
    }
    const chat = new Chat({
      uuid: uuid(),
      conversationId,
      user,
      attachments,
      ...(audio?.uri && {
        audio: {
          uri: audio?.uri || "",
          duration: fields?.audioDuration?.[0] || 0,
          mimeType: audio?.type || "",
          type: fields?.audioType?.[0] || "audio",
        },
      }),
    });

    await chat.save();

    res.status(200).json({
      message: "Support ticket created successfully",
      attachments: chat?.attachments,
      audio: chat?.audio,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = uploadFiles;
