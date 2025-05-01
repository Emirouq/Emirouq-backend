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
          visibleTo: {
            $in: [userId],
          },
        },
      },
      {
        $set: {
          receiver: {
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
        $set: {
          chatDetails: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$participants",
                  as: "user",
                  cond: {
                    $eq: ["$$user.user", userId],
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
          localField: "receiver",
          foreignField: "uuid",
          as: "receiver",
        },
      },
      {
        $unwind: "$receiver",
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
          lastMessageTime: -1,
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
