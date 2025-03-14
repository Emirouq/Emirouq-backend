const httpErrors = require("http-errors");
const SupportTicket = require("../../models/SupportTicket.model");
const formidable = require("formidable");
const { v4: uuid } = require("uuid");
const { upload } = require("../../services/util/upload-files");
const { sendEmail } = require("../../services/util/sendEmail");
const ticketCreatedTemplate = require("../../utils/templates/ticket");
const AdminModel = require("../../models/Admin.model");
const dayjs = require("dayjs");
const SupportActivity = require("../../models/SupportActivity.model");

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
const createSupport = async (req, res, next) => {
  try {
    const form = new formidable.IncomingForm();
    const { uuid: user, email } = req.user;

    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          next(err);
        }
        let { type, subject, description } = fields;
        type = type?.[0];
        subject = subject?.[0];
        description = description?.[0];
        if (!type || !subject || !description) {
          return next(httpErrors(400, "All fields are required"));
        }

        let attachments = [];
        if (files?.image?.length) {
          attachments = await Promise.all(
            files?.image?.map((file) =>
              uploadFilesToAws(file, `support/${user}`)
            )
          );
        }

        // it will get all the admin uuids
        let admin = await AdminModel.find({}, { uuid: 1 });
        admin = admin.map((admin) => admin.uuid);
        const lastTicketNumber = await SupportTicket.findOne()
          .sort({ createdAt: -1 })
          .limit(1);
        const lastMessageTime = dayjs().unix();

        const participants = [...admin, user]?.map((i) => {
          return {
            user: i,
            lastViewedTime: lastMessageTime,
          };
        });

        const supportTicket = new SupportTicket({
          uuid: uuid(),
          ticketNumber: (lastTicketNumber?.ticketNumber ?? 0) + 1,
          user,
          type,
          subject,
          participants,
        });

        await supportTicket.save();

        const activity = new SupportActivity({
          uuid: uuid(),
          userType: "customer",
          user,
          supportId: supportTicket.uuid,
          message: description,
          ...(attachments?.length && { attachments }),
        });

        // 1. Update lastViewedTime for the current user
        // 2. Increment count for all other users except the current user
        // 3: Since we cannot use the same field in the same update operation in arrayFilters (it supports only one field), we have to do it in two separate operations
        await Promise.all([
          SupportTicket.findOneAndUpdate(
            { uuid: supportTicket.uuid },
            {
              $set: {
                "participants.$[elem].lastViewedTime": lastMessageTime,
                lastMessageTime,
              },
            },
            {
              new: true,
              arrayFilters: [{ "elem.user": user }],
            }
          ),
          SupportTicket.findOneAndUpdate(
            { uuid: supportTicket.uuid },
            {
              $inc: {
                "participants.$[otherUser].count": 1,
              },

              $set: {
                "participants.$[otherUser].lastViewedTime": lastMessageTime - 1,
              },
            },
            {
              new: true,
              arrayFilters: [{ "otherUser.user": { $ne: user } }],
            }
          ),
        ]);
        await activity.save();

        //send email
        await sendEmail(
          // ["support@tradelizer.com"],
          `Support Ticket Created - Ticket Number: ${supportTicket.ticketNumber}`,
          ticketCreatedTemplate({
            userName: `${req.user.firstName} ${req.user.lastName}`,
            userEmail: email,
            ticketSubject: subject,
            ticketType: type,
            ticketDescription: description,
          })
          // "noreply@tradelizer.com"
        );
        res.status(200).json({
          message: "Support ticket created successfully",
        });
      } catch (error) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = createSupport;
