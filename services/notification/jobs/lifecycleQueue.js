const {
  notificationLifecycleQueue,
} = require("../../../bullmq/queue");
const {
  NOTIFICATION_LIFECYCLE_JOBS,
} = require("./lifecycleJobs");

const REPEAT_EVERY = 60 * 60 * 1000;
const ONE_DAY_SECONDS = 24 * 60 * 60;

const toReminderDelay = (unixEndDate, leadTimeSeconds = ONE_DAY_SECONDS) => {
  if (!unixEndDate) {
    return 0;
  }

  const runAt = Number(unixEndDate) * 1000 - leadTimeSeconds * 1000;
  return Math.max(runAt - Date.now(), 0);
};

const getSchedulers = async () => {
  if (typeof notificationLifecycleQueue.getJobSchedulers === "function") {
    return notificationLifecycleQueue.getJobSchedulers();
  }
  return notificationLifecycleQueue.getRepeatableJobs();
};

const addNotificationLifecycleJob = async ({ jobName, jobId }) => {
  const schedulers = await getSchedulers();
  const exists = schedulers.find((scheduler) => scheduler.id === jobId);

  if (exists) {
    return;
  }

  return notificationLifecycleQueue.add(
    jobName,
    {},
    {
      jobId,
      repeat: {
        every: REPEAT_EVERY,
      },
      removeOnComplete: true,
      removeOnFail: 100,
    }
  );
};

const removeNotificationLifecycleJob = async (jobKeyId) => {
  if (!jobKeyId) {
    return;
  }

  if (typeof notificationLifecycleQueue.removeJobScheduler === "function") {
    await notificationLifecycleQueue.removeJobScheduler(jobKeyId);
    return;
  }

  await notificationLifecycleQueue.removeRepeatableByKey(jobKeyId);
};

const addOneTimeNotificationJob = async ({ jobName, jobId, payload, delay }) => {
  const existingJob = await notificationLifecycleQueue.getJob(jobId);
  if (existingJob) {
    await existingJob.remove();
  }

  return notificationLifecycleQueue.add(jobName, payload, {
    jobId,
    delay,
    removeOnComplete: true,
    removeOnFail: 100,
  });
};

const addPackageRenewalReminderJob = async ({
  userId,
  subscriptionId,
  packageName,
  planName,
  endDate,
  categoryId,
}) => {
  if (!userId || !subscriptionId || !endDate) {
    return;
  }

  return addOneTimeNotificationJob({
    jobName: NOTIFICATION_LIFECYCLE_JOBS.PACKAGE_RENEWAL_REMINDER,
    jobId: `packageRenewalReminder-${subscriptionId}-${endDate}`,
    delay: toReminderDelay(endDate),
    payload: {
      userId,
      subscriptionId,
      packageName,
      planName,
      endDate,
      categoryId,
    },
  });
};

const addBoostExpiryReminderJob = async ({ postId, endDate }) => {
  if (!postId || !endDate) {
    return;
  }

  return addOneTimeNotificationJob({
    jobName: NOTIFICATION_LIFECYCLE_JOBS.BOOST_EXPIRY_REMINDER,
    jobId: `boostExpiryReminder-${postId}-${endDate}`,
    delay: toReminderDelay(endDate),
    payload: {
      postId,
      endDate,
    },
  });
};

const syncNotificationLifecycleJobs = async () => {
  console.log("Initializing notification lifecycle jobs...");

  const jobs = [
    {
      jobName: NOTIFICATION_LIFECYCLE_JOBS.AD_LIFECYCLE_SCAN,
      jobId: "notificationLifecycle-ad",
    },
    {
      jobName: NOTIFICATION_LIFECYCLE_JOBS.PAYMENT_LIFECYCLE_SCAN,
      jobId: "notificationLifecycle-payment",
    },
  ];

  for (const job of jobs) {
    await addNotificationLifecycleJob(job);
  }

  console.log("Notification lifecycle jobs initialized.");
};

module.exports = {
  addBoostExpiryReminderJob,
  addNotificationLifecycleJob,
  addPackageRenewalReminderJob,
  removeNotificationLifecycleJob,
  syncNotificationLifecycleJobs,
};
