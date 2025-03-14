const dayjs = require("dayjs");
const Trades = require("../../models/Trade.model");
const createHttpError = require("http-errors");

const getSingleTrade = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [data] = await Trades.aggregate([
      {
        $match: {
          uuid: id,
        },
      },
      //first we will get the date of the trade ,if the trade is closed then we will get the close date otherwise we will get the latest execution date
      {
        $set: {
          groupingDate: {
            $cond: [
              { $eq: ["$status", "closed"] },
              "$closeDate",
              "$latestExecutionDate",
            ],
          },
        },
      },
      //now we will format the date in the format of YYYY-MM-DD for daily Journal
      {
        $set: {
          formatDate: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$closeDate",
              timezone: "America/New_York",
            },
          },
        },
      },
      //we will get the daily journal of the trade
      {
        $lookup: {
          from: "dailyJournal",
          localField: "formatDate",
          foreignField: "date",
          as: "dailyJournal",
        },
      },
      {
        $unwind: {
          path: "$dailyJournal",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "executions",
          localField: "executions",
          foreignField: "uuid",
          as: "executions",
        },
      },
      {
        $set: {
          executions: {
            $sortArray: { input: "$executions", sortBy: { index: 1 } },
          },
        },
      },
    ]);
    // In old records, totalQuantity was not present so we have to calculate it
    // so  we are checking if totalQuantity is present or not if not then we are calculating it and updating it in the database
    // for realize and PLanned R multiple calculation we need totalQuantity
    if (!!data?.totalQuantity === false) {
      const totalQuantity = data?.executions
        ?.filter((i) =>
          data?.side === "long" ? i?.side === "buy" : i?.side === "sell"
        )
        ?.reduce((acc, curr) => acc + curr?.quantity, 0);
      await Trades.findOneAndUpdate(
        { uuid: id },
        { totalQuantity: totalQuantity }
      );
    }

    if (!!data === false) {
      throw createHttpError(404, "Trade not found");
    }

    res.json({
      message: "Fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getSingleTrade;
