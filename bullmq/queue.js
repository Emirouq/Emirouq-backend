const { Queue } = require("bullmq");
const connection = require("./connection");

const notificationLifecycleQueue = new Queue("notification-lifecycle", {
  connection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

module.exports = {
  notificationLifecycleQueue,
};
