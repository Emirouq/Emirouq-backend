const httpErrors = require("http-errors");
const formidable = require("formidable");
const { v4: uuid } = require("uuid");
const { upload } = require("../../services/util/upload-files");
const { sendEmail } = require("../../services/util/sendEmail");
const ticketCreatedTemplate = require("../../utils/templates/ticket");
const AdminModel = require("../../models/Admin.model");
const dayjs = require("dayjs");
const SupportTicket = require("../../models/Support.model");
const adminSupportTicket = require("../../services/templates/supportTicket");
const createTicketNumber = require("../../services/createTicketNumber");
const { historyEntry } = require("../../helpers/supportTickets");
const {
  notifyTicketCreated,
} = require("../../services/notification/supportNotifications");

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
    const { uuid: user, firstName, lastName, email } = req.user;

    let { title, description } = fields;
    title = title?.[0];
    description = description?.[0];
    if (!title || !description) {
      throw new Error("All fields are required");
    }

    let attachments = [];
    if (files?.image?.length) {
      attachments = await Promise.all(
        files?.image?.map((file) => uploadFilesToAws(file, `support/${user}`)),
      );
    }

    let ticketNumber = await createTicketNumber();

    const supportTicket = new SupportTicket({
      uuid: uuid(),
      ticketNumber,
      type: "general",
      status: "open",
      user,
      title,
      description,
      attachments,
      history: [
        historyEntry({
          action: "created",
          by: user,
          byRole: "customer",
          byName: `${firstName || ""} ${lastName || ""}`.trim(),
          toStatus: "open",
        }),
      ],
    });

    await supportTicket.save();
    notifyTicketCreated(supportTicket);
    // The ticket is saved; a mail failure must not turn into an error reply.
    await sendEmail(
      ["firebase-services@emirouq.ae"],
      `Support Ticket Created - Ticket Number: ${supportTicket.ticketNumber}`,
      adminSupportTicket({
        ticketId: ticketNumber,
        userName: firstName,
        userEmail: email,
        ticketTitle: title,
        ticketDescription: description,
        timestamp: supportTicket.createdAt,
        supportDashboardLink: "support@emiroue.ae",
      }),
      // "noreply@tradelizer.com"
    ).catch((error) => console.error("Support ticket email failed:", error));
    res.status(200).json({
      message: `Support ticket created. Your ticket number is ${supportTicket.ticketNumber}.`,
      data: { ticketNumber: supportTicket.ticketNumber, uuid: supportTicket.uuid },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = createSupport;
