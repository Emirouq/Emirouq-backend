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
      await redisClient.set(id?.toString(), "online");
    });

    socket?.on("heartbeat", async (id) => {
      try {
        socket.join(`${id}`);
        await redisClient.set(id?.toString(), "online");
      } catch (err) {
        console.log(err);
      }
    });

    //upon connection- only to user
    socket.emit("message", "hello");
    socket.on("fetchOnlineUser", async (userId, cb) => {
      // fetch userId conversationId
      // conversation model

      const status = await redisClient.get(userId?.toString());
      if (status) {
        cb(status);
      }
    });

    socket.on("conversationRoom", async (payload) => {
      const res = getAllOnlineUsers();

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
      const user = getUser(socket.id);
      if (!user) {
        return;
      }
      await userLeavesApp(user?.userId);
      if (user) {
        io.to(user?.conversationId).emit(
          "message",
          buildMessage(`${user.name} has left`, "admin", user?.conversationId)
        );
        const usersInRoom = getUsersInRoom(user?.conversationId);
        usersInRoom?.forEach((user) => {
          socket.broadcast.to(user?.userId).emit("status", "offline");
        });

        socket.broadcast.to(user?.conversationId).emit("fetchOnlineUser", {});
        io.emit("roomList", {
          rooms: getAllActiveRooms(),
        });
      }

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
const activateUser = (socketId, userId, conversationId) => {
  if (!socketId || !userId || !conversationId) {
    return;
  }
  const user = { socketId, userId, conversationId };
  // for no duplicate users
  UserState.setUsers([
    ...UserState.users.filter((user) => user?.userId !== userId),
    user,
  ]);
  return user;
};
//user Functions
const setOnlineUser = (socketId, userId) => {
  if (!socketId || !userId) {
    return;
  }
  const user = { socketId, userId };

  return user;
};
const getAllOnlineUsers = () => {
  return UserState.onlineUsers;
};

const userLeavesApp = async (id) => {
  if (!id) {
    return;
  }
  UserState.setUsers([
    ...UserState.users.filter((user) => user?.userId !== id),
  ]);
  await redisClient.del(id?.toString());
};

//get user by id
const getUser = (socketId) => {
  if (!socketId) {
    return;
  }
  const user = UserState.users.find((user) => user?.socketId === socketId);
  return user;
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
