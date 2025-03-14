const SupportTicket = require("../../models/SupportTicket.model");

const closeOpenSupportTicket = async (req, res, next) => {
  try {
    const { supportId } = req.params;
    const { status } = req.body;
    const { uuid: user } = req.user;
    await SupportTicket.updateMany(
      {
        uuid: supportId,
      },
      {
        $set: {
          status,
          ...(status === "closed" && { closedBy: user, reOpenBy: null }),
          ...(status === "open" && { reOpenBy: user, closedBy: null }),
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

module.exports = closeOpenSupportTicket;
