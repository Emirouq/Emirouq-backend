const SupportTicket = require("../../models/SupportTicket.model");

const getActivity = async (req, res, next) => {
  try {
    let searchCriteria = {};
    const { keyword } = req.query;
    const { supportId } = req.params;

    const data = await SupportTicket.aggregate([
      {
        $match: { ...searchCriteria, uuid: supportId },
      },
      {
        $lookup: {
          from: "supportActivity",
          localField: "uuid",
          foreignField: "supportId",
          as: "activity",
        },
      },
      {
        $lookup: {
          from: "user",
          localField: "user",
          foreignField: "uuid",
          as: "customer",
        },
      },
      {
        $unwind: {
          path: "$customer",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    res.json({
      data: data?.[0],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getActivity;
