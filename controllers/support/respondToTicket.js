const SupportTicket = require("../../models/Support.model");

const respondToTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    console.log("supportId", id, message);
    await SupportTicket.updateMany(
      {
        uuid: id,
      },
      {
        $set: {
          responded: true,
          adminResponse: message,
        },
      }
    );

    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = respondToTicket;
