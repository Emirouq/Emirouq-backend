const FaqModel = require("../../models/Faq.model");

const faqList = async (req, res, next) => {
  try {
    const data = await FaqModel.find({
      status: true,
    });

    res.status(200).json({
      message: "Detail fetch successfully.",
      data,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = faqList;
