const FaqsModel = require("../../models/Faq.model");

const faqList = async (req, res, next) => {
  try {
    const data = await FaqsModel.aggregate([
      {
        $match: {},
      },
    ]);

    res.status(200).json({
      message: "Detail fetch successfully.",
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = faqList;
