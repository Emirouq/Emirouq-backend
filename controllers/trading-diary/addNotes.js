const DailyJournal = require("../../models/DailyJournal.model");
const { v4: uuid } = require("uuid");
const formidable = require("formidable");
const { upload } = require("../../services/util/upload-files");
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
        let { journalId, notes, date, removedAttachments, type } = fields;
        //if user is updating the journal entry, journalId will be present
        journalId = journalId?.[0];
        notes = notes?.[0];
        date = date?.[0];
        type = type?.[0] || "diary";
        if (removedAttachments)
          removedAttachments = JSON.parse(removedAttachments);
        const { uuid: user } = req.user;
        // find the journal entry for the date
        let journal = await DailyJournal.findOne({
          $or: [{ date, user, type }, { uuid: journalId }],
        });

        let attachments = [];
        if (files?.image?.length) {
          attachments = await Promise.all(
            files?.image?.map((file) =>
              uploadFilesToAws(file, `trading-diary/${user}`)
            )
          );
        }

        // if journal entry exists, update the notes
        if (!journal) {
          journal = await DailyJournal.create({
            uuid: uuid(),
            date,
            notes,
            type,
            user,
            ...(attachments?.length && { attachments }),
          });
        } else {
          journal = await DailyJournal.findOneAndUpdate(
            { uuid: journalId },
            {
              $set: {
                notes,
                type,
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
        }
        res.status(200).json({
          success: true,
          data: journal,
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
