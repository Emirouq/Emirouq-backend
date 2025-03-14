const Enquiry = require("../../models/Contact.model");
const { sendEmail } = require("../../services/util/sendEmail");
const EnquiryTemplate = require("../../utils/templates/enquiry");
const addEnquiry = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body;

    const data = new Enquiry({
      firstName,
      lastName,
      email,
      phone,
      message,
    });

    data.save();
    //send email
    await sendEmail(
      // ["support@tradelizer.com"],
      `Enquiry Form Submission`,
      EnquiryTemplate({ firstName, lastName, email, phone, message })
      // "noreply@tradelizer.com"
    );
    res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully!",
    });
  } catch (error) {
    next(error);
  }
};
module.exports = addEnquiry;
