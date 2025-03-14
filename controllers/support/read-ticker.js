const dayjs = require("dayjs");
const SupportTicket = require("../../models/SupportTicket.model");

const ReadTicket = async (req, res, next) => {
  try {
    const { supportId } = req.params;
    const { uuid: user } = req.user;
    await SupportTicket.findOneAndUpdate(
      { uuid: supportId },
      {
        $set: {
          "participants.$[elem].lastViewedTime": dayjs().unix(),
          "participants.$[elem].count": 0,
        },
      },
      {
        new: true,
        arrayFilters: [{ "elem.user": user }],
      }
    );
    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = ReadTicket;
