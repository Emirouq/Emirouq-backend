const UserState = {
  users: [],
  setUsers: function (newUsers) {
    this.users = newUsers;
  },
};
const messageService = (io) => {
  io?.on("connection", (socket) => {
    console.log(socket.id);

    //join room

    socket.on("join_room", (id) => {
      socket.join(id);
    });

    socket?.on("heartbeat", async (id) => {
      console.log("heartbeat", id);
      try {
        socket.join(`${id}`);
      } catch (err) {
        console.log(err);
      }
    });

    //upon connection- only to user
    socket.emit("message", "hello");

    socket.on("conversationRoom", async ({ name, conversationId }) => {
      if (!name || !conversationId) {
        console.log("no conversation id created");
        return;
      }
      //leave previous room
      const prevRoom = getUser(socket?.id)?.conversationId;
      if (prevRoom) {
        socket.leave(prevRoom);
        io.to(prevRoom).emit(
          "message",
          `${name} has left the room ${prevRoom}`
        );
      }
      //join new room
      //activate user
      const user = activateUser(socket?.id, name, conversationId);

      //Cannot update previous room users list until after the user leaves
      if (prevRoom) {
        io.to(prevRoom).emit("userList", {
          users: getUsersInRoom(prevRoom),
        });
      }

      socket.join(user?.conversationId);

      //To user who just joined
      socket.emit(
        "message",
        buildMessage("Welcome", "admin", user?.conversationId)
      );

      //to all users in the room
      socket.broadcast
        .to(user.conversationId)
        .emit(
          "message",
          buildMessage(`${name} has joined`, "admin", user?.conversationId)
        );

      //update user list for room
      io.to(user?.conversationId).emit("userList", {
        users: getUsersInRoom(user?.conversationId),
      });

      // update rooms list for all users
      io.emit("roomList", {
        rooms: getAllActiveRooms(),
      });
    });

    // When the user disconnects - to all users
    socket.on("disconnect", () => {
      const user = getUser(socket.id);
      if (!user) {
        return;
      }
      userLeavesApp(user.id);
      if (user) {
        io.to(user?.conversationId).emit(
          "message",
          buildMessage(`${user.name} has left`, "admin", user?.conversationId)
        );
        io.to(user?.conversationId).emit("userList", {
          users: getUsersInRoom(user?.conversationId),
        });
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
module.exports = messageService;

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
const activateUser = (id, name, conversationId) => {
  if (!id || !name || !conversationId) {
    return;
  }
  const user = { id, name, conversationId };
  // for no duplicate users
  UserState.setUsers([
    ...UserState.users.filter((user) => user.id !== id),
    user,
  ]);
  return user;
};

const userLeavesApp = (id) => {
  if (!id) {
    return;
  }
  UserState.setUsers([...UserState.users.filter((user) => user.id !== id)]);
};

//get user by id
const getUser = (id) => {
  if (!id) {
    return;
  }
  const user = UserState.users.find((user) => user.id === id);
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

//get all users
const getAllUsers = () => {
  return UserState.users;
};
