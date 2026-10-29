const httpErrors = require("http-errors");
const {
  buildTemplate,
  templateFile,
} = require("../../services/import/masterDataImport");

/**
 * GET ?type=attributes|options&subCategoryId=…&format=csv|xlsx
 * Returns the template as base64 so the admin panel can save it with its
 * normal authenticated API client.
 */
const getImportTemplate = async (req, res, next) => {
  try {
    const { type, subCategoryId, format = "xlsx" } = req.query;
    if (!["attributes", "options"].includes(type)) {
      throw httpErrors.BadRequest("type must be attributes or options");
    }
    if (!subCategoryId) throw httpErrors.BadRequest("subCategoryId is required");
    if (!["csv", "xlsx"].includes(format)) {
      throw httpErrors.BadRequest("format must be csv or xlsx");
    }

    const template = await buildTemplate({ type, subCategoryId });
    if (!template.headers.length) {
      throw httpErrors.BadRequest(
        "This sub-category has no select or checkbox attributes yet. Import attributes first."
      );
    }

    res.json({
      message: "Template ready",
      data: { ...templateFile(template, format), headers: template.headers },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getImportTemplate;
