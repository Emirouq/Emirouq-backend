const messageService = (io) => {
  io?.on("connect", (socket) => {
    console.log(socket.handshake.query.session_id, "session_id");
    socket?.on("join_room", async (id) => {
      socket.join(id);
      console.log("joined");
    });
    socket?.on("heartbeat", async (id) => {
      console.log("heartbeat", id);
      try {
        socket.join(`${id}`);
      } catch (err) {
        console.log(err);
      }
    });
  });
};
module.exports = messageService;
