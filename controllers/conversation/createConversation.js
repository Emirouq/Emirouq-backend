const dayjs = require("dayjs");
const Conversation = require("../../models/Conversation.model");
const { v4: uuid } = require("uuid");
const createConversation = async (req, res, next) => {
  try {
    const { users, postId } = req.body;
    const date = dayjs().unix();
    const checkConversation = await Conversation.findOne({
      postId,
      users: { $all: users },
    });
    if (checkConversation) {
      return res.json({
        message: "Conversation already exists",
        data: checkConversation,
        isExist: true,
      });
    }

    const conversation = await Conversation.create({
      uuid: uuid(),
      postId,
      users,
      participants: users?.map((i) => ({
        user: i,
        lastViewedTime: date,
        count: 0,
      })),
      lastMessageTime: date,
      lastMessage: null,
      createdBy: req.user.uuid,
      visibleTo: [req.user.uuid],
    });
    res.json({
      message: "Conversation created successfully",
      data: conversation,
      isExist: false,
    });
  } catch (error) {
    next(error);
  }
};
module.exports = createConversation;
