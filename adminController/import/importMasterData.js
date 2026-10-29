const fs = require("fs");
const path = require("path");
const formidable = require("formidable");
const httpErrors = require("http-errors");
const { runImport } = require("../../services/import/masterDataImport");
const { recordAudit } = require("../../helpers/auditLog");

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

const parseForm = (req) =>
  new Promise((resolve, reject) => {
    // formidable v3's CommonJS export is an object, not a callable factory.
    const form = new formidable.IncomingForm({
      maxFileSize: MAX_FILE_SIZE,
      maxFiles: 1,
    });
    form.parse(req, (err, fields, files) =>
      err ? reject(httpErrors.BadRequest(err.message)) : resolve({ fields, files })
    );
  });

/**
 * POST multipart: file, type (attributes|options), subCategoryId,
 * mode (skip|update), dryRun (true|false).
 *
 * dryRun=true validates and returns the counts and issues without writing.
 */
const importMasterData = async (req, res, next) => {
  let filePath;
  try {
    const { fields, files } = await parseForm(req);
    const field = (name) => fields?.[name]?.[0];
    const file = files?.file?.[0];
    filePath = file?.filepath;

    const type = field("type");
    const subCategoryId = field("subCategoryId");
    const mode = field("mode") === "update" ? "update" : "skip";
    const dryRun = field("dryRun") !== "false";

    if (!["attributes", "options"].includes(type)) {
      throw httpErrors.BadRequest("type must be attributes or options");
    }
    if (!subCategoryId) throw httpErrors.BadRequest("subCategoryId is required");
    if (!file) throw httpErrors.BadRequest("Choose a CSV or Excel file");
    const extension = path
      .extname(file.originalFilename || "")
      .toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      throw httpErrors.BadRequest("Only .csv, .xlsx and .xls files are supported");
    }

    const report = await runImport({
      type,
      subCategoryId,
      filePath,
      mode,
      dryRun,
    });

    if (!dryRun && !report.fileErrors?.length) {
      recordAudit(req, {
        action: "import.create",
        entityType: "import",
        entityId: subCategoryId,
        note: `${type} import (${mode}) from ${file.originalFilename}`,
        details: report.summary,
      });
    }

    res.json({
      message: dryRun ? "Validation finished" : "Import finished",
      data: { ...report, dryRun, mode, type },
    });
  } catch (error) {
    next(error);
  } finally {
    if (filePath) fs.promises.unlink(filePath).catch(() => {});
  }
};

module.exports = importMasterData;
