const SupportTicket = require("../../models/SupportTicket.model");
const SupportActivity = require("../../models/SupportActivity.model");

const deleteSupport = async (req, res, next) => {
  try {
    const { id } = req.params;

    // await Promise.all([
    //   SupportTicket.findOneAndDelete({
    //     uuid: id,
    //   }),
    //   SupportActivity.deleteMany({ support: id }),
    // ]);

    await SupportTicket.findOneAndUpdate({ uuid: id }, { isDeleted: true });

    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = deleteSupport;
