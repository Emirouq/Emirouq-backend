const Trade = require("../../models/Trade.model");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const { searchBy } = require("../../utils/socket/searchBy");
const DailyJournal = require("../../models/DailyJournal.model");
dayjs.extend(utc);

const getNotebook = async (req, res, next) => {
  const { startDate, endDate, type } = req.query;
  const { uuid: userId } = req.user;

  let searchCriteria = {};
  if (startDate || endDate) {
    searchCriteria = {
      date: {},
    };

    if (startDate) {
      searchCriteria.date.$gte = dayjs(startDate)
        .startOf("day")
        .format("YYYY-MM-DD");
    }
    if (endDate) {
      searchCriteria.date.$lte = dayjs(endDate)
        .endOf("day")
        .format("YYYY-MM-DD");
    }
  }

  const matchQuery = {
    type: type,
    user: userId,
    ...(Object.keys(searchCriteria.date).length
      ? { date: searchCriteria.date }
      : {}),
  };
  try {
    const trades = await DailyJournal.aggregate([
      {
        $facet: {
          data: [
            {
              $match: matchQuery,
            },
          ],
          icons: [
            {
              $match: {
                type,
                user: userId,
              },
            },
          ],
        },
      },
    ]);
    console.log("trades", trades);
    res.status(200).json({
      success: true,
      data: trades?.[0]?.data,
      icons: trades?.[0]?.icons,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getNotebook;
