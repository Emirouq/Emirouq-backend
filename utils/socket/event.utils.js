const dayjs = require("dayjs");
const _ = require("lodash");
const Conversation = require("../../models/Conversation.model");
const ChatModel = require("../../models/Chat.model");
const redisClient = require("../Redis.util");
const { v4: uuid } = require("uuid");
const PushNotificationModel = require("../../models/PushNotification.model");
const pushNotification = require("../pushNotification.utils");
const UserState = {
  users: [],
  setUsers: function (newUsers) {
    this.users = newUsers;
  },
};
const getConversationDetails = async (conversationId, userId) => {
  const [user] = await Conversation.aggregate([
    {
      $match: {
        uuid: conversationId,
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
  ]);
  return user;
};

const socketEvents = (io) => {
  io?.on("connection", (socket) => {
    console.log(socket.id);

    //join room

    socket.on("join_room", async (id) => {
      socket.join(id);
      // await redisClient.sAdd("onlineUsers", id);
      await activateUser(socket.id, id);
      io.emit("fetchOnlineUsers", await getAllOnlineUsers());
    });

    socket?.on("heartbeat", async (id) => {
      try {
        socket.join(id);
        await activateUser(socket.id, id);
      } catch (err) {
        console.log(err);
      }
    });

    //upon connection- only to user
    socket.on("onlineUserList", async (cb) => {
      // conversation of userId
      // fetch pair of userId which are in the conversation
      const onlineUsers = await getAllOnlineUsers();
      if (!!onlineUsers?.length) {
        cb && cb(onlineUsers);
      }
    });

    socket.on("join_conversation", async (payload) => {
      const { userId, conversationId, sortConversation } = payload;
      if (!userId || !conversationId) {
        console.log("no conversation id created");
        return;
      }

      //join new room
      //activate user
      await Promise.all([
        activateUser(socket.id, userId),
        activateUserInRoom(socket, userId, conversationId),
      ]);

      const lastViewedTime = dayjs().unix();
      // //here also i have update the count to 0 and last viewed time to current time
      await Conversation.findOneAndUpdate(
        { uuid: conversationId },
        {
          $set: {
            "participants.$[elem].count": 0,
            "participants.$[elem].lastViewedTime": lastViewedTime,
          },
        },
        {
          new: true,
          arrayFilters: [
            {
              "elem.user": userId,
            },
          ],
        }
      );
      io.to(userId).emit("update_conversation_cache", {
        conversationId,
        firstConversation: false,
        // for sort by last message time we need to update the conversation cache , this prop is used to update the conversation cache , if false then it will not update the conversation cache
        sortConversation,
        chatDetails: {
          user: userId,
          count: 0,
          lastViewedTime,
        },
      });
    });

    //when app closes then have to remove the user from all the conversations

    //Listening to message event
    socket.on("message", async (data) => {
      //sender id is the user id
      const {
        conversationId,
        message,
        senderId,
        receiverId,
        type,
        post,
        attachments,
        uuid,
        audio,
      } = data;
      const lastMessageTime = dayjs().unix();
      const lastMessage = message
        ? message
        : attachments?.length
        ? `${attachments.length} new attachment ${
            attachments.length > 1 ? "s" : ""
          }`
        : audio?.uri
        ? "New audio message"
        : "";

      // check if the conversationId is valid
      if (!conversationId) {
        console.log("no conversation id created");
        return;
      }
      // check if the conversation exists
      let conversation = await Conversation.findOne({
        uuid: conversationId,
        visibleTo: { $all: [senderId, receiverId] },
      });
      // if either sender or receiver is not in the conversation , add them to the conversation
      if (!conversation) {
        // add the receiver to the conversation
        await Conversation.findOneAndUpdate(
          { uuid: conversationId },
          {
            $addToSet: {
              visibleTo: receiverId,
            },
          },
          { new: true }
        );
        conversation = await getConversationDetails(conversationId, receiverId);

        // add the sender to the conversation
        io.to(receiverId).emit("update_conversation_cache", {
          conversationId,
          //this prop is passed to the client which signifies that this is the first time the user is joining the conversation
          firstConversation: true,
          // for sort by last message time we need to update the conversation cache , this prop is used to update the conversation cache , if false then it will not update the conversation cache
          sortConversation: true,
          lastMessage,
          lastMessageTime: lastMessageTime,
          post,
          ...conversation,
          chatDetails: {
            user: receiverId,
            count: 1,
            lastViewedTime: lastMessageTime,
          },
        });
      }
      const userIsInConversation = await getUsersInRoom(conversationId);

      // here we are updating the last message time and the last message
      // and the count of the message for the sender and receiver
      await Conversation.findOneAndUpdate(
        { uuid: conversationId },
        {
          $set: {
            lastMessage,
            lastMessageTime: lastMessageTime,
            "participants.$[elem].lastViewedTime": lastMessageTime,
            "participants.$[elem].count": 0,
          },
        },
        {
          new: true,
          arrayFilters: [
            {
              "elem.user": senderId,
            },
          ],
        }
      );

      let receiverRes;
      //if the receiver is not in the conversation

      if (!userIsInConversation.includes(receiverId)) {
        receiverRes = await Conversation.findOneAndUpdate(
          { uuid: conversationId },
          {
            $set: {
              lastMessage,
              lastMessageTime: lastMessageTime,
            },
            $inc: {
              "participants.$[elem].count": 1,
            },
          },
          {
            new: true,
            arrayFilters: [
              {
                "elem.user": {
                  $ne: senderId,
                },
              },
            ],
          }
        );
      }
      io.to(senderId).emit("update_conversation_cache", {
        conversationId,
        lastMessage,
        lastMessageTime: lastMessageTime,
        // for sort by last message time we need to update the conversation cache , this prop is used to update the conversation cache , if false then it will not update the conversation cache
        sortConversation: true,
        firstConversation: false,
        chatDetails: {
          user: senderId,
          count: 0,
          lastViewedTime: lastMessageTime,
        },
      });
      //here we are updating the last message time and the last message for the receiver
      io.to(receiverId).emit("update_conversation_cache", {
        conversationId,
        firstConversation: false,
        // for sort by last message time we need to update the conversation cache , this prop is used to update the conversation cache , if false then it will not update the conversation cache
        sortConversation: true,
        lastMessage,
        lastMessageTime: lastMessageTime,
        // user is not in the conversation
        ...(receiverRes
          ? {
              chatDetails: receiverRes?.participants.find(
                (user) => user.user === receiverId
              ),
            }
          : // receiver is in the conversation
            {
              chatDetails: {
                user: receiverId,
                count: 0,
                lastViewedTime: lastMessageTime,
              },
            }),
      });

      let seenBy = [senderId];
      if (userIsInConversation?.includes(receiverId)) {
        seenBy = [senderId, receiverId];
      }

      const receiverToken = await PushNotificationModel.findOne({
        user: receiverId,
      });
      // // add the message to the conversation on receiver side
      const messageData = buildMessage({
        uuid,
        conversationId,
        user: senderId,
        message,
        type,
        attachments,
        audio,
        seenBy,
      });
      const payload = {
        expoPushToken: receiverToken?.token,
        message: {
          title: `New message from ${conversation?.receiver?.firstName}`,
          body: `${lastMessage}`,
        },
      };
      await pushNotification(payload);

      io.to(receiverId).emit("message", {
        message: messageData,
      });
      // here we are updating the seenBy array of the chat
      if (userIsInConversation?.includes(receiverId)) {
        io.to(senderId).emit("seen_message", {
          conversationId,
          seenBy: [senderId, receiverId],
        });
      }
      //if message then create the chat
      // for attachments we have different service that saves the attachments in s3 and inserts the data in the db
      if (message) await ChatModel.create(messageData);
    });

    // seen message
    socket.on("seen_message", async (payload) => {
      const { conversationId, userId, receiverId } = payload;
      if (!userId || !conversationId || !receiverId) {
        console.log("no conversation id created");
        return;
      }
      const isChatExists = await ChatModel.findOne({
        conversationId,
      });
      // here we are checking if the chat exists or not
      // if the chat does not exist then we are not updating the seenBy array
      if (!isChatExists) {
        console.log("no chat found");
        return;
      }
      // here we are updating the seenBy array of the chat
      await ChatModel.updateMany(
        {
          conversationId,
          user: receiverId,
        },
        {
          $addToSet: {
            seenBy: [userId, receiverId],
          },
        }
      );

      // send the seen message to the receiver , that the message has been seen
      io.to(receiverId).emit("seen_message", {
        conversationId,
        seenBy: [userId, receiverId],
      });
    });

    //Listen for typing event
    socket.on("activity", (data) => {
      if (!data) {
        return;
      }
      const room = getUser(socket.id)?.conversationId;
      if (!room) {
        return;
      }
      socket.broadcast.to(room).emit("activity", {
        user: data.user,
        typing: data.typing,
      });
    });

    //when user leaves the conversation
    socket.on("leave_conversation", async (payload) => {
      const { userId, conversationId } = payload;
      if (!userId || !conversationId) {
        console.log("no conversation id created");
        return;
      }
      //leave room
      socket.leave(conversationId);
      //remove user from room
      await redisClient.sRem(conversationId, userId);
      console.log("User left conversation", conversationId);
    });

    // When the user disconnects - to all users
    socket.on("disconnect", async () => {
      const user = await getUser(socket.id);

      await Promise.all([
        userLeavesApp(user?.userId),
        clearSocketCache(socket.id),
      ]);
      const onlineUsers = await getAllOnlineUsers();
      console.log(onlineUsers, "onlineUsers");
      io.emit("fetchOnlineUsers", onlineUsers);

      console.log("User disconnected", socket.id);
    });
    socket.on("upload_image", async (imageData) => {
      //..other code..
      // const imageBuffer = Buffer.from(base64, "base64");
      // const fileSizeInBytes = imageBuffer.length; // or get from imageData if client sends it
      // const params = {
      //   /*...*/
      // };
      // s3.upload(params, (err, data) => {
      //   //... error handling ...
      // }).on("httpUploadProgress", (progress) => {
      //   const progressPercentage = Math.round(
      //     (progress.loaded / fileSizeInBytes) * 100
      //   );
      //   socket.emit("upload_progress", progressPercentage);
      // });
      //..other code..
    });
  });
};
module.exports = socketEvents;

function buildMessage({
  uuid,
  conversationId,
  user,
  message,
  type = "text",
  attachments = [],
  audio = {},
  seenBy = [],
}) {
  return {
    uuid,
    conversationId,
    user,
    message,
    type,
    attachments,
    createdAt: new Date(),
    seenBy,
    audio,
  };
}

//user Functions
const activateUser = async (socketId, userId) => {
  if (!socketId || !userId) {
    return;
  }
  await Promise.all([
    redisClient.set(socketId, userId),
    redisClient.sAdd("onlineUsers", userId),
  ]);
};

//users in the same room
const activateUserInRoom = async (socket, userId, conversationId) => {
  if (!userId || !conversationId) {
    return;
  }
  socket.join(conversationId);
  await redisClient.sAdd(conversationId, userId);
};

const getAllOnlineUsers = async () => {
  return await redisClient.sMembers("onlineUsers");
};

const userLeavesApp = async (id) => {
  if (!id) {
    return;
  }
  await redisClient.sRem("onlineUsers", id);
};
const clearSocketCache = async (id) => {
  if (!id) {
    return;
  }
  await redisClient.del(id);
};

//get user by id
const getUser = async (socketId) => {
  if (!socketId) {
    return;
  }
  const userId = await redisClient.get(socketId);
  if (!userId) {
    return;
  }
  return {
    socketId,
    userId,
  };
};

//get users that are in the same room
const getUsersInRoom = async (conversationId) => {
  if (!conversationId) {
    return;
  }
  const users = await redisClient.sMembers(conversationId);
  return users;
};

//get all active rooms
const getAllActiveRooms = () => {
  return Array.from(
    new Set(UserState.users.map((user) => user?.conversationId))
  );
};
