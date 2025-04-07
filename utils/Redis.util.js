const { createClient } = require("redis");
const { redis } = require("../config/keys");

let redisClient;

(async () => {
  redisClient = createClient({
    url: redis.url,
  });
  await redisClient.connect();
  redisClient.on("error", function (error) {
    console.error("Error in redis connect: ", error);
  });
})();

module.exports = redisClient;
