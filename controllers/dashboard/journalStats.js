const DailyJournal = require("../../models/DailyJournal.model");
const journalStats = async (req, res, next) => {
  const { uuid: userId } = req.user;

  try {
    const data = await DailyJournal.aggregate([
      {
        $match: {
          user: userId,
          notes: {
            $ne: null,
          },
        },
      },

      // now we are grouping the trades by date
      // {
      //   $group: {
      //     _id: {
      //       $dateToString: {
      //         format: "%Y-%m-%d",
      //         date: "$groupingDate",
      //         timezone: "America/New_York",
      //       },
      //     },
      //   },
      // },
    ]);

    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = journalStats;
