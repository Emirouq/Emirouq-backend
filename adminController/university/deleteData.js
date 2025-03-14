const University = require("../../models/University.model");
const createHttpError = require("http-errors");
const deleteSection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    if (sectionId) {
      await University.findOneAndDelete({ uuid: sectionId });

      res.json({
        message: "Section deleted successfully",
      });
    } else {
      throw createHttpError(400, "Section not found!");
    }
  } catch (error) {
    next(error);
  }
};

module.exports = deleteSection;
