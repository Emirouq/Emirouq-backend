const DailyJournal = require("../../models/DailyJournal.model");
const { v4: uuid } = require("uuid");
const formidable = require("formidable");
const { upload } = require("../../services/util/upload-files");
const Trade = require("../../models/Trade.model");
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
const addNotes = async (req, res, next) => {
  try {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          res.status(400);
          res.send(err);
        }
        const { tradeId } = req.params;
        let { notes, removedAttachments } = fields;
        notes = notes?.[0];
        if (removedAttachments)
          removedAttachments = JSON.parse(removedAttachments);
        const { uuid: user } = req.user;
        // find the journal entry for the date
        let trade = await Trade.findOne({
          uuid: tradeId,
        });
        if (!trade) {
          throw new Error("Trade not found");
        }

        let attachments = [];
        if (files?.image?.length) {
          attachments = await Promise.all(
            files?.image?.map((file) =>
              uploadFilesToAws(file, `trading-diary/${user}`)
            )
          );
        }

        const data = await Trade.findOneAndUpdate(
          { uuid: tradeId },
          {
            $set: {
              notes,
            },
            $addToSet: {
              ...(attachments?.length && { attachments }),
            },
            $pull: {
              ...(removedAttachments?.length && {
                attachments: { uuid: { $in: removedAttachments } },
              }),
            },
          },
          { new: true }
        );

        res.status(200).json({
          success: true,
          data,
        });
      } catch (err) {
        next(err);
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = addNotes;
