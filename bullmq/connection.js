const IORedis = require("ioredis");
const { redis } = require("../config/keys");

const connection = new IORedis(redis.url, {
  maxRetriesPerRequest: null,
});

module.exports = connection;
