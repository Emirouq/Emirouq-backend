const redisClient = require("../Redis.util");

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

    socket.on("conversationRoom", async (payload) => {
      const { userId, conversationId } = payload;
      if (!userId || !conversationId) {
        console.log("no conversation id created");
        return;
      }
      //leave previous room
      const prevRoom = getUser(socket?.id)?.conversationId;
      if (prevRoom) {
        socket.leave(prevRoom);
        io.to(prevRoom).emit("message", "Left previous room");
      }
      //join new room
      //activate user
      const user = activateUser(socket?.id, userId, conversationId);

      //Cannot update previous room users list until after the user leaves
      if (prevRoom) {
        io.to(prevRoom).emit("userList", {
          users: getUsersInRoom(prevRoom),
        });
      }

      socket.join(user?.conversationId);

      //to all users in the room
      socket.broadcast.to(user?.conversationId).emit("message", "Just joined");

      //update user list for room
      io.to(user?.conversationId).emit("userList", {
        users: getUsersInRoom(user?.conversationId),
      });

      io.to(user?.conversationId).emit("onlineUsers", {
        users: getAllOnlineUsers(),
      });

      // update rooms list for all users
      io.emit("roomList", {
        rooms: getAllActiveRooms(),
      });
      console.log("User joined", user);
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

    //Listening to message event
    socket.on("message", async (data) => {
      const room = getUser(socket.id)?.conversationId;
      if (!room) {
        return;
      }
      io.to(room).emit("message", {
        message: buildMessage(data.message, socket.id, room),
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
  });
};
module.exports = socketEvents;

function buildMessage() {
  return {
    // message,
    // senderId,
    // receiverId,
    // type,
    // isRead,
    // createdAt: new Intl.DateTimeFormat("default", {
    //   hour: "numeric",
    //   minute: "numeric",
    //   second: "numeric",
    // }).format(new Date()),
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
const getUsersInRoom = (room) => {
  if (!room) {
    return;
  }
  const users = UserState.users.filter((user) => user?.conversationId === room);
  return users;
};

//get all active rooms
const getAllActiveRooms = () => {
  return Array.from(
    new Set(UserState.users.map((user) => user?.conversationId))
  );
};
