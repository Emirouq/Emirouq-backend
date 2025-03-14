const axios = require("axios");

const fetchQuesTradeAccount = async (accessToken, apiServer) => {
  const response = await axios.get(`${apiServer}v1/accounts`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data.accounts[0].number;
};

module.exports = fetchQuesTradeAccount;
