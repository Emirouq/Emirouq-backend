const axios = require("axios");
const qs = require("querystring");
const {
  consumerKey,
  requestTokenUrl,
  consumerSecret,
  generateOAuthSignature,
  generateNonce,
  getTimestamp,
  buildAuthorizationHeader,
  authorizeUrl,
  callbackUrl,
} = require("../../../services/brokerSync/ETrade");

// 1. Initiate Authorization: Get a Request Token and Redirect
const etradeAuthorize = async (req, res, next) => {
  const oauthParameters = {
    oauth_nonce: generateNonce(),
    oauth_timestamp: getTimestamp(),
    oauth_consumer_key: consumerKey,
    oauth_callback: "oob",
    oauth_signature_method: "HMAC-SHA1",
  };
  const signature = generateOAuthSignature(
    "POST",
    requestTokenUrl,
    oauthParameters,
    consumerSecret
  );

  oauthParameters.oauth_signature = signature;

  const authHeader = buildAuthorizationHeader(oauthParameters);
  try {
    const response = await axios.post(requestTokenUrl, null, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const responseData = qs.parse(response.data);
    const requestToken = responseData.oauth_token;
    const requestTokenSecret = responseData.oauth_token_secret;
    const redirectUrl = `${authorizeUrl}?key=${consumerKey}&token=${requestToken}`;
    res.json({ url: redirectUrl });
    // res.redirectUrl(redirectUrl);
  } catch (error) {
    next(error);
  }
};

module.exports = etradeAuthorize;
