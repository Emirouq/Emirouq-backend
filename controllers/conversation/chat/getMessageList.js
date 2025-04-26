const Chat = require("../../../models/Chat.model");
const getMessageList = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { start = 0, limit = 25 } = req.query;
    const [chat] = await Chat.aggregate([
      {
        $match: {
          conversationId,
        },
      },
      {
        $facet: {
          data: [
            {
              $sort: {
                createdAt: -1,
              },
            },
            {
              $skip: parseInt(start),
            },
            {
              $limit: parseInt(limit),
            },
          ],
          total: [
            {
              $count: "total",
            },
          ],
        },
      },
      // {
      //   $project: {
      //     total: { $arrayElemAt: ["$total.total", 0] },
      //     data: "$data",
      //   },
      // },
    ]);
    res.json({
      success: true,
      message: "Message List",
      data: chat?.data || [],
      total: chat?.total?.[0]?.total || 0,
    });
  } catch (error) {
    next(error);
  }
};
module.exports = getMessageList;
