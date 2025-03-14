const axios = require("axios");

const timezoneSearch = async ({ keyword }) => {
  try {
    // const response = await axios.get(
    //   "https://timeapi.io/api/TimeZone/AvailableTimeZones",
    //   {
    //     headers: {
    //       accept: "application/json",
    //     },
    //   }
    // );

    // const regex = new RegExp(keyword, "i");
    // const data = response.data?.filter((item) => regex.test(item));
    // return data;
    return;
  } catch (error) {
    console.error("Error fetching time zones:", error);
    throw error;
  }
};

module.exports = timezoneSearch;
