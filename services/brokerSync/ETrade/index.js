const {
  etradeKeys: { apiKey, secretApiKey, callbackUrl },
} = require("../../../config/keys");
const qs = require("querystring");
const crypto = require("crypto");
const requestTokenUrl = "https://apisb.etrade.com/oauth/request_token";
const accessTokenUrl = "https://apisb.etrade.com/oauth/access_token";
const authorizeUrl = "https://us.etrade.com/e/t/etws/authorize";
const accountListURL = "https://apisb.etrade.com/v1/accounts/list.json"; // Example
const getOrdersUrl = (accountIdKey) =>
  `https://apisb.etrade.com/v1/accounts/${accountIdKey}/orders`;

// Application Credentials (from .env file)

// OAuth 1.0a Signature Function
function generateOAuthSignature(
  method,
  url,
  parameters,
  consumerSecret,
  tokenSecret = ""
) {
  const baseString = buildBaseString(method, url, parameters);
  const signingKey = `${encodeURIComponent(
    consumerSecret
  )}&${encodeURIComponent(tokenSecret)}`;
  return crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");
}

// Helper Functions for OAuth
function buildBaseString(method, url, parameters) {
  const encodedParameters = Object.keys(parameters)
    .sort()
    .reduce((obj, key) => {
      obj[key] = parameters[key];
      return obj;
    }, {});

  return `${method.toUpperCase()}&${encodeURIComponent(
    url
  )}&${encodeURIComponent(qs.stringify(encodedParameters))}`;
}

function generateNonce() {
  return Math.random().toString(36).substring(2, 15);
}

function getTimestamp() {
  return Math.floor(Date.now() / 1000);
}

// Function to build the OAuth Authorization header
function buildAuthorizationHeader(parameters) {
  return (
    "OAuth " +
    Object.keys(parameters)
      .map((key) => `${key}="${encodeURIComponent(parameters[key])}"`)
      .join(", ")
  );
}

module.exports = {
  requestTokenUrl,
  accessTokenUrl,
  authorizeUrl,
  accountListURL,
  getOrdersUrl,
  consumerKey: apiKey,
  consumerSecret: secretApiKey,
  callbackUrl,
  generateOAuthSignature,
  buildBaseString,
  generateNonce,
  getTimestamp,
  buildAuthorizationHeader,
};
