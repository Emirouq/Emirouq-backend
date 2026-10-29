const httpErrors = require("http-errors");
const Conversation = require("../../models/Conversation.model");
const { userLookup } = require("../../helpers/userProjection");

/**
 * One conversation in the same shape as an item of GET /conversation, so the
 * app can open the chat screen from a notification with the other user and
 * the advertisement filled in.
 */
const getConversationById = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;
    const { conversationId } = req.params;

    const [conversation] = await Conversation.aggregate([
      {
        $match: {
          uuid: conversationId,
          // Only someone in the chat may read it.
          users: { $in: [userId] },
          isDeleted: { $ne: true },
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
                  cond: { $ne: ["$$user", userId] },
                },
              },
              0,
            ],
          },
          chatDetails: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$participants",
                  as: "user",
                  cond: { $eq: ["$$user.user", userId] },
                },
              },
              0,
            ],
          },
          receiverOnline: {
            $let: {
              vars: {
                otherObj: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$participants",
                        as: "user",
                        cond: { $ne: ["$$user.user", userId] },
                      },
                    },
                    0,
                  ],
                },
              },
              in: { lastOnlineTime: "$$otherObj.lastOnlineTime" },
            },
          },
        },
      },
      userLookup({ localField: "receiver", as: "receiver" }),
      { $unwind: "$receiver" },
      {
        $lookup: {
          from: "posts",
          localField: "postId",
          foreignField: "uuid",
          as: "post",
        },
      },
      // Keep the chat reachable even if its ad was deleted.
      { $unwind: { path: "$post", preserveNullAndEmptyArrays: true } },
    ]);

    if (!conversation) {
      throw httpErrors.NotFound("Conversation not found");
    }

    res.json({
      success: true,
      message: "Conversation details",
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getConversationById;
