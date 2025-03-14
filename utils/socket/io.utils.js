const socketIO = require("socket.io");

let io;
// function initSocket(server) {
//   io = socketIO(server, {
//     cors: {
//       origin: "*",
//     },
//   });
// }
const getSocket = () => {
  // if (!io) {
  //   throw new Error("Socket.io not initialized");
  // }
  return io;
};

const setIo = (newIo) => {
  io = newIo;
};

module.exports = { getSocket, setIo };
