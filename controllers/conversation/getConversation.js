const Conversation = require("../../models/Conversation.model");
const { searchBy } = require("../../utils/socket/searchBy");
const getConversation = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;
    const { start = 0, limit = 10, keyword } = req.query;

    const searchCriteria = searchBy({
      keyword,
    });

    const [getList] = await Conversation.aggregate([
      {
        $match: {
          ...searchCriteria,
          users: {
            $in: [userId],
          },
        },
      },
      {
        $set: {
          user: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$users",
                  as: "user",
                  cond: {
                    $ne: ["$$user", userId],
                  },
                },
              },
              0,
            ],
          },
        },
      },

      {
        $lookup: {
          from: "user",
          localField: "user",
          foreignField: "uuid",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },

      {
        $lookup: {
          from: "posts",
          localField: "postId",
          foreignField: "uuid",
          as: "post",
        },
      },
      {
        $unwind: "$post",
      },
      {
        $sort: {
          updatedAt: -1,
        },
      },
      {
        $facet: {
          data: [
            {
              $skip: parseInt(start),
            },
            {
              $limit: parseInt(limit),
            },
          ],
          totalCount: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);
    res.json({
      success: true,
      message: "Conversation list",
      data: getList?.data || [],
      totalCount: getList?.totalCount?.[0]?.count || 0,
    });
  } catch (error) {
    next(error);
  }
};
module.exports = getConversation;
