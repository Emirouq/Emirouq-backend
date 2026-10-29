const SupportTicket = require("../../models/Support.model");
const { userLookup, SECRET_USER_FIELDS_PROJECTION } = require("../../helpers/userProjection");

const getActivity = async (req, res, next) => {
  try {
    let searchCriteria = {};
    const { keyword } = req.query;
    const { supportId } = req.params;

    const data = await SupportTicket.aggregate([
      {
        $match: {
          ...searchCriteria,
          uuid: supportId,
          // Only the ticket's owner or an admin may read it.
          ...(!["admin", "Admin"].includes(req.user?.role) && {
            user: req.user?.uuid,
          }),
        },
      },
      {
        $lookup: {
          from: "supportActivity",
          localField: "uuid",
          foreignField: "supportId",
          as: "activity",
        },
      },
      userLookup({ localField: "user", as: "customer", projection: SECRET_USER_FIELDS_PROJECTION }),
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
