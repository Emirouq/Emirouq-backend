const axios = require("axios");
const fetchQuesTradeAccount = require("./fetchQuesTradeAccount");

const generateQuesTradeAPIToken = async (token) => {
  // `https://login.questrade.com/oauth2/token?grant_type=refresh_token&refresh_token=${token}`
  const response = await axios.get(
    `https://login.questrade.com/oauth2/token?grant_type=refresh_token&refresh_token=${token}`
  );
  // const accountId = await fetchQuesTradeAccount(
  //   response.data.access_token,
  //   response.data.api_server
  // );

  return { ...response.data };
};

module.exports = generateQuesTradeAPIToken;
