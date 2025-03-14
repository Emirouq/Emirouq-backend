const { sendEmail } = require("../../services/util/sendEmail");

const replyToEnquiry = async (req, res, next) => {
  try {
    const { recipients, subject, template } = req.body;
    // await sendEmail([recipients], subject, template, "support@tradelizer.com");
    res.status(200).json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = replyToEnquiry;
