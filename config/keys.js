const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});
module.exports = {
  host: {
    environmental: process.env.NODE_ENV,
    port: process.env.PORT,
    hostIP: process.env.HOST || "127.0.0.1",
    dbUrl:
      process.env.NODE_ENV === "test"
        ? //TEST_DB_CONNECT
          process.env.TEST_DB_CONNECT
        : process.env.LIVE_DB_CONNECT,
    dbName: process.env.NODE_ENV === "test" ? "trade" : "trade",
    utilsUrl:
      process.env.NODE_ENV === "test"
        ? process.env.LIVE_UTILS_URL
        : process.env.LIVE_UTILS_URL,
  },
  jwt: {
    accessSecret: process.env.ACCESS_TOKEN_SECRET,
    accessTokenLife: process.env.ACCESS_TOKEN_LIFE,
    refreshSecret: process.env.REFRESH_TOKEN_SECRET,
    refreshTokenLife: process.env.REFRESH_TOKEN_LIFE,
  },
  aws: {
    bucketName: process.env.AWS_BUCKET_NAME,
    fileURL: `https://s3-${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_BUCKET_NAME}`,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    sesSenderAddress: process.env.AWS_SES_SENDER_ADDRESS,
  },
  redis: {
    url: "redis://localhost:6379",
    EX: 60 * 60 * 24,
  },
  emailverifyKey: {
    initVector: process.env.EMAIL_VERIFY_INIT_VECTOR,
    securitykey: process.env.EMAIL_VERIFY_SECURITY_KEY,
    algorithm: process.env.EMAIL_VERIFY_ALGORITHM,
    liveRedirectUrl: process.env.EMAIL_VERIFY_LIVE_REDIRECT_URL,
    testRedirectUrl: process.env.TEST_REDIRECT_URL,
  },
  clientUrl:
    process.env.NODE_ENV === "test"
      ? process.env.TEST_REDIRECT_URL
      : process.env.EMAIL_VERIFY_LIVE_REDIRECT_URL,
  environmental: {
    nodeEnv: process.env.NODE_ENV,
  },
  stripe: {
    publishableKey:
      process.env.NODE_ENV === "test"
        ? process.env.STRIPE_TEST_PUBLISHABLE_KEY
        : process.env.STRIPE_PUBLISHABLE_KEY,
    secretKey:
      process.env.NODE_ENV === "test"
        ? process.env.STRIPE_TEST_SECRET_KEY
        : process.env.STRIPE_SECRET_KEY,
  },
  zeptoSecret: process.env.ZEPTO_SECRET,
};
