const axios = require("axios");

const getTickers = ({ keyword = "", market = "stocks" }) => {
  return axios({
    method: "get",
    url: `https://api.polygon.io/v3/reference/tickers?market=${market}&search=${keyword}&active=true&limit=20&apiKey=WTg2XzAvDo8fhiY1nS5hsHbQvLS1FxAb`,
  });
};

module.exports = getTickers;
