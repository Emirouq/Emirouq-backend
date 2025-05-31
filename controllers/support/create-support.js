const httpErrors = require("http-errors");
const formidable = require("formidable");
const { v4: uuid } = require("uuid");
const { upload } = require("../../services/util/upload-files");
const { sendEmail } = require("../../services/util/sendEmail");
const ticketCreatedTemplate = require("../../utils/templates/ticket");
const AdminModel = require("../../models/Admin.model");
const dayjs = require("dayjs");
const SupportTicket = require("../../models/Support.model");

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

const createSupport = async (req, res, next) => {
  try {
    const { fields, files } = await parseForm(req);
    const { uuid: user } = req.user;

    let { title, description } = fields;
    title = title?.[0];
    description = description?.[0];
    if (!title || !description) {
      return next(httpErrors(400, "All fields are required"));
    }

    let attachments = [];
    if (files?.image?.length) {
      attachments = await Promise.all(
        files?.image?.map((file) => uploadFilesToAws(file, `support/${user}`))
      );
    }

    const supportTicket = new SupportTicket({
      uuid: uuid(),
      user,
      title,
      description,
      attachments,
    });

    await supportTicket.save();

    //send email
    // await sendEmail(
    //   // ["support@tradelizer.com"],
    //   `Support Ticket Created - Ticket Number: ${supportTicket.ticketNumber}`,
    //   ticketCreatedTemplate({
    //     userName: `${req.user.firstName} ${req.user.lastName}`,
    //     userEmail: email,
    //     ticketSubject: subject,
    //     ticketType: type,
    //     ticketDescription: description,
    //   })
    //   // "noreply@tradelizer.com"
    // );
    res.status(200).json({
      message: "Support ticket created successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = createSupport;
