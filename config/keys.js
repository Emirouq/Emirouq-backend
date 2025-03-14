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
  assumePassword: process.env.ASSUME_PASSWORD,
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
  url: {
    testUrl: process.env.TEST_REDIRECT_URL,
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
    secretKey: process.env.STRIPE_SECRET_KEY,
    // secretKey: process.env.TRADELIZER_TEST_STRIPE_SECRET,
    webhookSecret: "",
    plans: {
      tier1: "price_1P6eFJIQbETn6H6Gcbxl2c5j",
      // changed below price object to test sub in ms kahlon stripe account
      // tier2: "price_1Pti28Rr6q50oN7HX2nh77ES",
      tier2: "price_1PxCQBRr6q50oN7H0cSiHaip",
      testing: "price_1PrxoFIQbETn6H6GzOfFmkCA",
      trial: "price_1PRoDaIQbETn6H6GD9QWATIm",
      usdTier1: "price_1PdWD1IQbETn6H6GbELelTQl",
      usdTier2: "price_1PdWCYIQbETn6H6GdKsNSJWG",
      tradeLizerTesting: "price_1PsdGwLLkrr5CKPjPYOfQShb",
    },
    // webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  zeptoSecret: process.env.ZEPTO_SECRET,
  snapTrade: {
    consumerKey: process.env.SNAPTRADE_CONSUMER_KEY,
    clientId: process.env.SNAPTRADE_CLIENT_ID,
  },
  twelvedata: {
    apiKey: process.env.TWELVEDATA_API_KEY,
  },
  metaApi: {
    apiKey: process.env.META_API_KEY,
  },
  marketStack: {
    apiKey: process.env.MARKETSTACK_API_KEY,
  },
  etradeKeys: {
    apiKey:
      process.env.NODE_ENV === "test"
        ? process.env.ETRADE_TEST_API_KEY
        : process.env.ETRADE_LIVE_API_KEY,
    secretApiKey:
      process.env.NODE_ENV === "test"
        ? process.env.ETRADE_TEST_SECRET_KEY
        : process.env.ETRADE_LIVE_SECRET_KEY,
    // callbackUrl: {
    //   live: process.env.ETRADE_LIVE_CALLBACK_URL,
    //   local: process.env.ETRADE_LOCAL_CALLBACK_URL,
    //   test: process.env.ETRADE_TEST_CALLBACK_URL,
    // },
    callbackUrl:
      process.env.NODE_ENV === "test"
        ? process.env.ETRADE_LOCAL_CALLBACK_URL
        : process.env.ETRADE_LIVE_CALLBACK_URL,
  },
};
