require("dotenv").config();
const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const qs = require("querystring");

const app = express();
const port = 3001;

// E*Trade API Endpoints (Sandbox)
// const requestTokenUrl = "https://apisb.etrade.com/oauth/request_token";
// const accessTokenUrl = "https://apisb.etrade.com/oauth/access_token";
// const authorizeUrl = "https://us.etrade.com/e/t/etws/authorize";
// const accountListURL = "https://apisb.etrade.com/v1/accounts/list.json"; // Example
const getOrdersUrl = (accountIdKey) =>
  `https://apisb.etraaade.com/v1/accounts/${accountIdKey}/orders`;

// Application Credentials (from .env file)
const consumerKey = process.env.ETRADE_CONSUMER_KEY;
const consumerSecret = process.env.ETRADE_CONSUMER_SECRET;
const callbackUrl = `http://localhost:3001/callback`; // Your server's callback URL

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

// Store tokens (in memory for this example, use a database in production)
let requestToken = "1M+iW2/nbE09cdrp3D6yA0pOn55MZJPrzJH9TM6B1QyqFQ=";
let requestTokenSecret = "kBAULK01zqxYX9SoR88CHE0tTGhyVmPFlV7y2E2g2FU=";
// Access Token: ep72qdyt27VQc7wegxElrfjQOcSXwi0jqAMZBCUu/Vs=
// Access Token Secret: a5WFfDudxvnJX9rhqSyTl9+VLgXaQlZRMWyNfVNO/6o=
// Account ID Key: dBZOKt9xDrtRSAOl4MSiiA
let accessToken = "ep72qdyt27VQc7wegxElrfjQOcSXwi0jqAMZBCUu/Vs=";
let accessTokenSecret = "a5WFfDudxvnJX9rhqSyTl9+VLgXaQlZRMWyNfVNO/6o=";
let accountIdKey = "6_Dpy0rmuQ9cu9IbTfvF2A";

// 1. Initiate Authorization: Get a Request Token and Redirect
app.get("/authorize", async (req, res) => {
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
    requestToken = responseData.oauth_token;
    requestTokenSecret = responseData.oauth_token_secret;

    // 2. Redirect to E*Trade for Authorization
    const redirectUrl = `${authorizeUrl}?key=${consumerKey}&token=${requestToken}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error getting request token:", error.response.data);
    res.status(500).send("Error initiating authorization.");
  }
});

// 3. Handle Callback and Get Access Token
app.get("/get_access-token", async (req, res) => {
  const { oauth_token: returnedToken, oauth_verifier: verifier = "HW9XR" } =
    req.query;
  //   // Verify the returned token matches
  //   if (returnedToken !== requestToken) {
  //     return res.status(400).send("Invalid oauth_token returned.");
  //   }

  const oauthParameters = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: getTimestamp(),
    oauth_token: requestToken,
    oauth_verifier: verifier,
  };

  const signature = generateOAuthSignature(
    "POST",
    accessTokenUrl,
    oauthParameters,
    consumerSecret,
    requestTokenSecret
  );
  oauthParameters.oauth_signature = signature;

  const authHeader = buildAuthorizationHeader(oauthParameters);

  try {
    const response = await axios.post(accessTokenUrl, null, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const responseData = qs.parse(response.data);
    accessToken = responseData.oauth_token;
    accessTokenSecret = responseData.oauth_token_secret;

    // Store access token and secret (replace with database storage in production)
    await getAccountId();

    res.send("Authorization successful! You can now make API calls.");
  } catch (error) {
    console.error("Error getting access token:", error.response.data);
    res.status(500).send("Error completing authorization.");
  }
});

// 4. Example API Call (Get Account List) - Requires Access Token
app.get("/accounts", async (req, res) => {
  if (!accessToken || !accessTokenSecret) {
    return res
      .status(401)
      .send("Not authorized. Please visit /authorize first.");
  }

  const oauthParameters = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: getTimestamp(),
    oauth_token: accessToken,
  };

  const signature = generateOAuthSignature(
    "GET",
    accountListURL,
    oauthParameters,
    consumerSecret,
    accessTokenSecret
  );
  oauthParameters.oauth_signature = signature;

  const authHeader = buildAuthorizationHeader(oauthParameters);

  try {
    const response = await axios.get(accountListURL, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    if (error.response) {
      console.error("Data:", error.response.data);
      console.error("Status:", error.response.status);
    }
    res.status(500).send("Error fetching accounts.");
  }
});

async function getAccountId() {
  const oauthParameters = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: getTimestamp(),
    oauth_token: accessToken, // Use the access token
  };

  const signature = generateOAuthSignature(
    "GET",
    accountListURL,
    oauthParameters,
    consumerSecret,
    accessTokenSecret
  );
  oauthParameters.oauth_signature = signature;

  const authHeader = buildAuthorizationHeader(oauthParameters);

  try {
    const response = await axios.get(accountListURL, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
    });

    // Assuming the account ID is in the first account in the list:
    if (
      response.data &&
      response.data.AccountListResponse &&
      response.data.AccountListResponse.Accounts &&
      response.data.AccountListResponse.Accounts.Account &&
      response.data.AccountListResponse.Accounts.Account.length > 0
    ) {
      accountIdKey =
        response.data.AccountListResponse.Accounts.Account[0].accountIdKey;
    } else {
      console.error("Account ID Key not found in response.");
    }
  } catch (error) {
    console.error("Error getting account ID:", error);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    }
  }
}

// 6. Get Orders
app.get("/orders", async (req, res) => {
  //   if (!accessToken || !accessTokenSecret || !accountIdKey) {
  //     return res.status(401).send("Not authorized or account ID key not found.");
  //   }

  const ordersUrl = getOrdersUrl(accountIdKey);
  const oauthParameters = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: getTimestamp(),
    oauth_token: accessToken,
  };

  const signature = generateOAuthSignature(
    "GET",
    ordersUrl,
    oauthParameters,
    consumerSecret,
    accessTokenSecret
  );
  oauthParameters.oauth_signature = signature;

  const authHeader = buildAuthorizationHeader(oauthParameters);
  const requestOptions = {
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
    },
    // You can add query parameters to filter orders, for example:
    // params: {
    //   count: 50,
    //   status: 'OPEN'
    // }
  };

  try {
    const response = await axios.get(ordersUrl, requestOptions);

    res.json(response.data);
  } catch (error) {
    console.error("Error getting orders:", error);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    }
    res.status(500).send("Error fetching orders.");
  }
});
