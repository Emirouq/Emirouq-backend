const Conversation = require("../../models/Conversation.model");
const getPostConversation = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;
    const { postId } = req.params;

    const data = await Conversation.findOne({
      postId,
      users: {
        $in: [userId],
      },
    });
    res.json({
      conversationId: data?.uuid,
    });
  } catch (error) {
    next(error);
  }
};
module.exports = getPostConversation;
