const { Worker } = require("bullmq");
const connection = require("./connection");
const {
  NOTIFICATION_LIFECYCLE_JOBS,
  processNotificationLifecycleJob,
} = require("../services/notification/jobs/lifecycleJobs");

const startNotificationLifecycleWorker = () => {
  const worker = new Worker(
    "notification-lifecycle",
    async (job) => {
      await processNotificationLifecycleJob(job.name, job.data);
    },
    {
      connection,
      concurrency: 1,
    },
  );

  worker.on("completed", (job) => {
    console.log(`Notification lifecycle job completed: ${job.name}`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `Notification lifecycle job failed: ${job?.name || "unknown"}`,
      err,
    );
  });

  return worker;
};

module.exports = {
  NOTIFICATION_LIFECYCLE_JOBS,
  startNotificationLifecycleWorker,
};
