const createHttpError = require("http-errors");
const University = require("../../models/University.model");

const getSingleSection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    if (sectionId) {
      const data = await University.findOne({ uuid: sectionId });
      res.json({
        message: "Fetched successfully",
        data: data,
      });
    } else {
      throw createHttpError(400, "Section not found!");
    }
  } catch (error) {
    next(error);
  }
};

module.exports = getSingleSection;
