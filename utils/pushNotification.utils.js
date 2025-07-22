// import { Expo } from "expo-server-sdk";
// import { expoConfig } from "../config/keys.js";

const { Expo } = require("expo-server-sdk");
const expoConfig = require("../config/keys.js").expoConfig;

// Create a new Expo SDK client
const expo = new Expo({ accessToken: expoConfig.accessToken });
async function pushNotification({ expoPushToken, message }) {
  // if (!Expo.isExpoPushToken(expoPushToken)) {
  //   throw new Error(`Invalid Expo push token:`);
  // }
  const messages = [
    {
      to: expoPushToken,
      sound: "default",
      body: message.body,
      // data: message.data ?? {},
    },
  ];

  const tickets = [];

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("❌ Error sending push notification:", error);
    }
  }
  let response = "";

  for (const ticket of tickets) {
    if (ticket.status === "error") {
      if (ticket.details && ticket.details.error === "DeviceNotRegistered") {
        response = "DeviceNotRegistered";
      }
    }

    if (ticket.status === "ok") {
      response = ticket.id;
    }
  }

  return { tickets, response };
}

module.exports = pushNotification;
