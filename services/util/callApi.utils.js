const axios = require("axios");
const { utilsUrl, environmental } = require("../../config/keys").host;
console.log("environmental", environmental);
const deleteAgenda = async ({ id }) => {
  if (environmental === "test") return;
  try {
    await axios.delete(`${utilsUrl}schedule/delete-job`, {
      data: { id },
    });
  } catch (error) {
    console.error("Error during schedule deletion:", error);
  }
  return;
};
const emitSocketEvent = async ({ body: { room, key, status, error, id } }) => {
  if (environmental === "test") return;
  try {
    await axios.post(`${utilsUrl}socket/emit`, {
      room,
      key,
      status,
      error,
      id,
    });
  } catch (error) {
    console.error("Error during socket event emit:", error);
  }
  return;
};

const createAgenda = async ({ name, scheduleTime, data, skipImmediate }) => {
  if (environmental === "test") return;
  try {
    await axios.post(`${utilsUrl}schedule/createSimpleSchedule`, {
      name,
      scheduleTime,
      data,
      skipImmediate,
    });

    // Process the response (e.g., check for success status, extract data)
  } catch (error) {
    console.error("Error during schedule creation:", error);
  }
  return;
};

module.exports = { createAgenda, deleteAgenda, emitSocketEvent };
