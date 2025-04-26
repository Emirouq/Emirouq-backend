const dayjs = require("dayjs");
const _ = require("lodash");
const Conversation = require("../../models/Conversation.model");
const ChatModel = require("../../models/Chat.model");
const redisClient = require("../Redis.util");
const { v4: uuid } = require("uuid");
const UserState = {
  users: [],
  setUsers: function (newUsers) {
    this.users = newUsers;
  },
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
    socket.emit("message", "hello");
    socket.on("onlineUserList", async (cb) => {
      const onlineUsers = await getAllOnlineUsers();
      if (!!onlineUsers?.length) {
        cb && cb(onlineUsers);
      }
    });

    socket.on("join_conversation", async (payload) => {
      const { userId, conversationId } = payload;
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
        participant: {
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
      const { conversationId, message, senderId, receiverId, type, details } =
        data;

      // check if the conversationId is valid
      if (!conversationId) {
        console.log("no conversation id created");
        return;
      }
      // check if the conversation exists
      const conversation = await Conversation.findOne({
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

        // add the sender to the conversation
        io.to(receiverId).emit("update_conversation_cache", {
          ...details,
          conversationId,
        });
      }
      const userIsInConversation = await getUsersInRoom(conversationId);
      const lastMessageTime = dayjs().unix();
      //if both users are in the conversation

      //if the receiver is not in the conversation
      //here we are updating the last message time and the last message
      // and the count of the message for the sender and receiver
      const senderRes = await Conversation.findOneAndUpdate(
        { uuid: conversationId },
        {
          $set: {
            lastMessage: message,
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
      if (!userIsInConversation.includes(receiverId)) {
        receiverRes = await Conversation.findOneAndUpdate(
          { uuid: conversationId },
          {
            $set: {
              lastMessage: message,
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
        //here we are updating the last message time and the last message for the receiver
        io.to(receiverId).emit("update_conversation_cache", {
          ...details,
          conversationId,
          lastMessage: message,
          lastMessageTime: lastMessageTime,
          ...(receiverRes && {
            participant: receiverRes?.participants.find(
              (user) => user.user === receiverId
            ),
          }),
        });
      }
      //if both users are in the conversation
      if (
        _.isEqual(
          _.sortBy(userIsInConversation),
          _.sortBy([senderId, receiverId])
        )
      ) {
        //here we are updating the last message time and the last message for the sender and receiver
        io.to(senderId).emit("update_conversation_cache", {
          conversationId,
          lastMessage: message,
          lastMessageTime: lastMessageTime,
          participant: {
            user: senderId,
            count: 0,
            lastViewedTime: lastMessageTime,
          },
        });
        io.to(receiverId).emit("update_conversation_cache", {
          conversationId,
          lastMessage: message,
          lastMessageTime: lastMessageTime,
          participant: {
            user: receiverId,
            count: 0,
            lastViewedTime: lastMessageTime,
          },
        });
      }
      // // add the message to the conversation on receiver side
      const messageData = buildMessage({
        conversationId,
        user: senderId,
        message,
        type,
      });
      io.to(receiverId).emit("message", {
        message: messageData,
      });
      await ChatModel.create(messageData);
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
      console.log("User left");
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
  });
};
module.exports = socketEvents;

function buildMessage({
  conversationId,
  user,
  message,
  type = "text",
  attachments = [],
}) {
  return {
    uuid: uuid(),
    conversationId,
    user,
    message,
    type,
    attachments,
    // createdAt: new Intl.DateTimeFormat("default", {
    //   hour: "numeric",
    //   minute: "numeric",
    //   second: "numeric",
    // }).format(new Date()),
    // date: new Date().toISOString().split("T")[0],
    // time: new Date().toLocaleTimeString("en-US", {
    //   hour: "2-digit",
    //   minute: "2-digit",
    // }),
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
