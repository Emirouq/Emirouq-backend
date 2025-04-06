const router = require("express").Router();

// bring in models and controllers
const createConversation = require("../../controllers/conversation/createConversation");
const getConversation = require("../../controllers/conversation/getConversation");
const sendMessage = require("../../controllers/conversation/chat/sendMessage");
const getMessageList = require("../../controllers/conversation/chat/getMessageList");

// conversation apis
router.get("/", getConversation);
router.post("/", createConversation);

//chat apis
router.get("/:conversationId/get-message-list", getMessageList);
router.post("/:conversationId/send-message", sendMessage);

module.exports = router;
