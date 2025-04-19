const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const axios = require("axios");
const { SendMailClient } = require("zeptomail");

const { accessKeyId, secretAccessKey, region, sesSenderAddress } =
  require("../../config/keys").aws;
const zeptoSecret = require("../../config/keys").zeptoSecret;

const SES_CONFIG = {
  accessKeyId: accessKeyId,
  secretAccessKey: secretAccessKey,
  region: region,
};
const ses = new AWS.SES(SES_CONFIG);

let transporter = nodemailer.createTransport({
  SES: ses,
});

const sendMultipleAttachmentEmail = async (
  recipients,
  subject,
  template,
  attachments
) => {
  let info = await transporter.sendMail({
    from: sesSenderAddress,
    to: recipients,
    subject: subject,
    html: template,
    attachments,
  });
  return info;
};

const sendAttachmentEmail = async (
  recipients,
  subject,
  template,
  attachmentPath
) => {
  let filePath, pdfContent;
  // Read file content as binary
  filePath = path.join(__dirname, "attachment_files", attachmentPath);
  pdfContent = fs.readFileSync(filePath);
  // Convert binary content to base64
  const base64Content = pdfContent.toString("base64");

  let info = await transporter.sendMail({
    from: sesSenderAddress,
    to: recipients,
    subject: subject,
    html: template,
    attachments: [
      {
        filename: attachmentPath,
        content: base64Content,
        encoding: "base64",
        contentType: "application/pdf",
      },
    ],
  });
  console.log("Message sent: %s", info.messageId);
  return info;
};

/**
 * Sends email address
 * @param {Array} recipients - Array of recipient email addresses
 * @param {String} subject - Subject line of the email
 * @param {String} template - Email body in html with inline styles
 */
// const sesSendEmail = (recipients, subject, template) => {
//   return new Promise((resolve, reject) => {
//     try {
//       // console.log("template, ", template);
//       // const data = {
//       //   from: {
//       //     address: "noreply@tradelizer.com",
//       //     name: "TradeLizer - No Reply",
//       //   },
//       //   to: recipients.map((i) => ({ email_address: { address: i } })),
//       //   subject,
//       //   htmlbody: template,
//       // };
//       // return axios.post("https://api.zeptomail.in/v1.1/email", data, {
//       //   headers: {
//       //     Accept: "application/json",
//       //     "Content-Type": "application/json",
//       //     Authorization: zeptoSecret,
//       //   },
//       // });
//       // .then(() => resolve())
//       // .catch(() => reject());
//       const params = {
//         Destination: {
//           ToAddresses: recipients,
//           // BccAddresses: ["masafvi48@gmail.com"],
//         },
//         Message: {
//           Body: {
//             Html: {
//               // HTML Format of the email
//               Charset: "UTF-8",
//               Data: template,
//             },
//           },
//           Subject: {
//             Charset: "UTF-8",
//             Data: subject,
//           },
//         },
//         Source: "admin@tradelizer.com",
//       };
//       const sendEmail = async () => await ses.sendEmail(params).promise();
//       sendEmail().then(() => resolve());
//     } catch (error) {
//       return reject(error);
//     }
//   });
// };
const sendEmail = (recipients, subject, template) => {
  return new Promise((resolve, reject) => {
    try {
      const url = "api.zeptomail.com/";
      const token =
        "Zoho-enczapikey wSsVR610qBelX6ormjWvI7xqy11XD1LxQU4o3VL07HH0T63A/MdqkhHMUFKjG/VOEGFuEGca978szkpShzVfi9x+n1sCDCiF9mqRe1U4J3x17qnvhDzMWmRYlRSJL4wAwQ5jnWBkFM4h+g==";

      let client = new SendMailClient({ url, token });

      client
        .sendMail({
          from: {
            address: "noreply@emirouq.ae",
            name: "noreply",
          },
          to: recipients?.map((i) => ({ email_address: { address: i } })),
          subject: subject,
          htmlbody: template,
        })
        .then((resp) => resolve(resp))
        .catch((error) => reject(error));
    } catch (error) {
      console.error("Error sending email:", error);
      return reject(error);
    }
  });
};

const generateOTP = () => {
  var digits = "0123456789";
  var otpLength = 4;
  var otp = "";
  for (let i = 1; i <= otpLength; i++) {
    var index = Math.floor(Math.random() * digits.length);
    otp = otp + digits[index];
  }
  return otp;
};

module.exports = {
  generateOTP,
  sendEmail,
  sendAttachmentEmail,
  sendMultipleAttachmentEmail,
};
