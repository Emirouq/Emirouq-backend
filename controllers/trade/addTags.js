const httpErrors = require("http-errors");
const Trade = require("../../models/Trade.model");
const Execution = require("../../models/Execution.model");
const dayjs = require("dayjs");
const addTags = async (req, res, next) => {
  try {
    const { categories, tags } = req.body;
    const { tradeId } = req.params;
    const trade = await Trade.findOne({ uuid: tradeId });
    if (!trade) {
      throw httpErrors(404, "Trade not found");
    }
    const newTagAssign = {};
    tags?.forEach((tag) => {
      // Only add the tag if it doesn't exist or if it was previously removed (not in tagAssign)
      if (!trade?.tagAssign || !trade?.tagAssign[tag]) {
        // since when filtering with startDate and endDate , date format has to be in BSON date type
        // coz in old records date in BSON date type
        newTagAssign[tag] = { assignDate: dayjs().toDate() };
      }
    });

    await Trade.findOneAndUpdate(
      {
        uuid: tradeId,
      },

      {
        $set: {
          categories,
          tags,
        },
      },
      {
        $set: {
          tagAssign: {
            ...trade?.tagAssign,
            ...newTagAssign,
          },
        },
      },
      { new: true }
    );
    await Execution.updateMany(
      { tradeId: tradeId },
      { $set: { categories, tags } }
    );

    res.status(200).json({
      message: "Trade tags added successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = addTags;
