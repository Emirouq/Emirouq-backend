const XLSX = require("xlsx");
const { v4: uuid } = require("uuid");
const Attribute = require("../../models/Attribute.model");
const AttributeOption = require("../../models/AttributeOption.model");
const SubCategory = require("../../models/SubCategory.model");
const {
  cleanValue,
  normalizeValue,
} = require("../../helpers/masterDataDuplicates");

/**
 * Bulk import of category master data for one sub-category.
 *
 *  - "attributes": the fields of a sub-category (Brand, Model, Color, …).
 *  - "options":    the values of those fields (Toyota → Corolla → GLi, Red…).
 *                  One column per field; a child value is created under the
 *                  parent value written in the same row.
 *
 * Imports only ever add records or, in "update" mode, refresh existing ones.
 * Nothing is deleted. Run with `dryRun: true` first to validate: it returns
 * the same counts and errors without writing anything.
 */

const MAX_ROWS = 5000;
const MAX_VALUE_LENGTH = 100;
const FILTER_TYPES = ["text", "number", "select", "checkbox"];
const OPTION_TYPES = ["select", "checkbox"];

const ATTRIBUTE_COLUMNS = [
  "Label",
  "Filter Type",
  "Depends On",
  "Order",
  "Visible In Filter",
];

// ---------------------------------------------------------------- parsing

/** First sheet of a CSV or Excel file as { headers, rows } (rows are objects). */
const parseSpreadsheet = (filePath) => {
  const workbook = XLSX.readFile(filePath, { raw: false, cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { headers: [], rows: [] };

  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: false,
  });
  const headers = (matrix[0] || []).map((header) => cleanValue(header));
  const rows = matrix.slice(1).map((cells) =>
    headers.reduce((row, header, index) => {
      if (header) row[header] = cleanValue(cells[index]);
      return row;
    }, {})
  );
  return { headers: headers.filter(Boolean), rows };
};

/** Case-insensitive header lookup: "brand" matches column "Brand". */
const columnIndex = (headers) =>
  headers.reduce((map, header) => {
    map[normalizeValue(header)] = header;
    return map;
  }, {});

const parseBoolean = (value, fallback) => {
  const text = normalizeValue(value);
  if (!text) return fallback;
  if (["yes", "y", "true", "1"].includes(text)) return true;
  if (["no", "n", "false", "0"].includes(text)) return false;
  return null;
};

// ----------------------------------------------------------------- report

const createReport = () => ({
  summary: { rows: 0, created: 0, updated: 0, skipped: 0, failed: 0 },
  // Failed and skipped records with the reason, for the downloadable report.
  issues: [],
  fileErrors: [],
});

const record = (report, status, issue) => {
  report.summary[status] += 1;
  if (issue) report.issues.push({ status, ...issue });
};

// ---------------------------------------------------------- sub-category

const loadSubCategory = async (subCategoryId) => {
  const subCategory = await SubCategory.findOne({ uuid: subCategoryId }).lean();
  if (!subCategory) {
    const error = new Error("Sub-category not found");
    error.status = 404;
    throw error;
  }
  const attributes = await Attribute.find({ subCategory: subCategoryId })
    .sort({ order: 1, label: 1 })
    .lean();
  return { subCategory, attributes };
};

/** Finds the attribute a `dependsOn` value points to (label or key). */
const findParentAttribute = (attributes, dependsOn) => {
  const key = normalizeValue(dependsOn);
  if (!key) return null;
  return (
    attributes.find(
      (attribute) =>
        normalizeValue(attribute.label) === key ||
        normalizeValue(attribute.attributeKey) === key
    ) || null
  );
};

/**
 * Option-carrying attributes, parents before children
 * (Brand, Model, Variant, Color…), which is also the template column order.
 */
const orderedOptionAttributes = (attributes) => {
  const optionAttributes = attributes.filter((attribute) =>
    OPTION_TYPES.includes(attribute.filterType)
  );
  const childrenOf = new Map();
  const roots = [];
  for (const attribute of optionAttributes) {
    const parent = findParentAttribute(optionAttributes, attribute.dependsOn);
    if (parent && parent.uuid !== attribute.uuid) {
      if (!childrenOf.has(parent.uuid)) childrenOf.set(parent.uuid, []);
      childrenOf.get(parent.uuid).push(attribute);
    } else {
      roots.push(attribute);
    }
  }
  const ordered = [];
  const seen = new Set();
  const visit = (attribute) => {
    if (seen.has(attribute.uuid)) return; // guards against a dependsOn loop
    seen.add(attribute.uuid);
    ordered.push(attribute);
    (childrenOf.get(attribute.uuid) || []).forEach(visit);
  };
  roots.forEach(visit);
  optionAttributes.forEach(visit); // anything left in a loop
  return ordered;
};

// ------------------------------------------------------------- templates

const buildTemplate = async ({ type, subCategoryId }) => {
  const { subCategory, attributes } = await loadSubCategory(subCategoryId);

  if (type === "attributes") {
    return {
      fileBase: `${subCategory.title}-attributes`,
      headers: ATTRIBUTE_COLUMNS,
      instructions: [
        ["Column", "Required", "What to enter"],
        ["Label", "Yes", "Field name shown to users, e.g. Brand, Model, Color"],
        ["Filter Type", "Yes", "One of: text, number, select, checkbox"],
        [
          "Depends On",
          "No",
          "Label of the parent field, e.g. Model depends on Brand. The parent must be select or checkbox.",
        ],
        ["Order", "No", "Display order, a whole number"],
        ["Visible In Filter", "No", "yes or no (default yes)"],
        [],
        [
          "Existing attributes",
          "",
          attributes.map((attribute) => attribute.label).join(", ") || "none",
        ],
      ],
    };
  }

  const columns = orderedOptionAttributes(attributes);
  return {
    fileBase: `${subCategory.title}-options`,
    headers: columns.map((attribute) => attribute.label),
    instructions: [
      ["Column", "Depends on", "What to enter"],
      ...columns.map((attribute) => {
        const parent = findParentAttribute(attributes, attribute.dependsOn);
        return [
          attribute.label,
          parent ? parent.label : "",
          parent
            ? `A ${attribute.label} value; fill ${parent.label} in the same row.`
            : `A ${attribute.label} value.`,
        ];
      }),
      [],
      [
        "Example",
        "",
        "Brand=Toyota, Model=Corolla in one row adds Corolla under Toyota. Leave cells empty when not needed.",
      ],
    ],
  };
};

/** Template as a downloadable file, base64-encoded for a JSON response. */
const templateFile = (template, format) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([template.headers]),
    "Import"
  );
  if (format === "xlsx") {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(template.instructions),
      "Instructions"
    );
  }
  const bookType = format === "xlsx" ? "xlsx" : "csv";
  const buffer = XLSX.write(workbook, { type: "buffer", bookType });
  return {
    fileName: `${template.fileBase.replace(/[^\w-]+/g, "_")}-template.${bookType}`,
    mimeType:
      bookType === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv",
    base64: Buffer.from(buffer).toString("base64"),
  };
};

// ------------------------------------------------------ attributes import

const importAttributes = async ({ subCategoryId, rows, mode, dryRun }) => {
  const report = createReport();
  const { subCategory, attributes } = await loadSubCategory(subCategoryId);

  // Known attributes by normalized label: from the DB, then rows of this file.
  const known = new Map(
    attributes.map((attribute) => [normalizeValue(attribute.label), attribute])
  );
  const seenInFile = new Set();
  const optionCounts = new Map(
    (
      await AttributeOption.aggregate([
        { $match: { attributeId: { $in: attributes.map((a) => a.uuid) } } },
        { $group: { _id: "$attributeId", count: { $sum: 1 } } },
      ])
    ).map((entry) => [entry._id, entry.count])
  );

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2; // header is row 1
    const label = cleanValue(row.Label);
    const fail = (column, value, reason) =>
      record(report, "failed", { row: rowNumber, column, value, reason });

    if (!label && !Object.values(row).some(Boolean)) continue; // blank row
    report.summary.rows += 1;

    if (!label) {
      fail("Label", "", "Label is required");
      continue;
    }
    if (label.length > MAX_VALUE_LENGTH) {
      fail("Label", label, `Label is longer than ${MAX_VALUE_LENGTH} characters`);
      continue;
    }
    const key = normalizeValue(label);
    if (seenInFile.has(key)) {
      record(report, "skipped", {
        row: rowNumber,
        column: "Label",
        value: label,
        reason: "Duplicate of an earlier row in this file",
      });
      continue;
    }
    seenInFile.add(key);

    const filterType = normalizeValue(row["Filter Type"]);
    if (!FILTER_TYPES.includes(filterType)) {
      fail(
        "Filter Type",
        row["Filter Type"] || "",
        `Filter Type must be one of: ${FILTER_TYPES.join(", ")}`
      );
      continue;
    }

    const dependsOnText = cleanValue(row["Depends On"]);
    let parent = null;
    if (dependsOnText) {
      parent = known.get(normalizeValue(dependsOnText)) || null;
      if (!parent) {
        fail(
          "Depends On",
          dependsOnText,
          "Parent attribute not found in this sub-category or in earlier rows"
        );
        continue;
      }
      if (normalizeValue(parent.label) === key) {
        fail("Depends On", dependsOnText, "An attribute cannot depend on itself");
        continue;
      }
      if (!OPTION_TYPES.includes(parent.filterType)) {
        fail(
          "Depends On",
          dependsOnText,
          "Parent attribute must be a select or checkbox field"
        );
        continue;
      }
    }

    const orderText = cleanValue(row.Order);
    const order = orderText === "" ? undefined : Number(orderText);
    if (order !== undefined && !Number.isInteger(order)) {
      fail("Order", orderText, "Order must be a whole number");
      continue;
    }
    const visibleInFilter = parseBoolean(row["Visible In Filter"], true);
    if (visibleInFilter === null) {
      fail("Visible In Filter", row["Visible In Filter"], "Use yes or no");
      continue;
    }

    const existing = known.get(key);
    if (existing && existing.uuid) {
      if (mode !== "update") {
        record(report, "skipped", {
          row: rowNumber,
          column: "Label",
          value: label,
          reason: "Already exists",
        });
        continue;
      }
      // Changing the type or parent of a field that already has values would
      // break those values, so update mode only touches safe settings.
      if (existing.filterType !== filterType) {
        fail(
          "Filter Type",
          filterType,
          `Existing attribute is "${existing.filterType}"; its type cannot be changed by import`
        );
        continue;
      }
      const existingParent = normalizeValue(existing.dependsOn);
      if (
        existingParent !== normalizeValue(parent?.label) &&
        (optionCounts.get(existing.uuid) || 0) > 0
      ) {
        fail(
          "Depends On",
          dependsOnText,
          "Existing attribute already has values; its parent cannot be changed by import"
        );
        continue;
      }

      const changes = {};
      if (order !== undefined && order !== existing.order) changes.order = order;
      if (visibleInFilter !== (existing.visibleInFilter ?? true))
        changes.visibleInFilter = visibleInFilter;
      if (existingParent !== normalizeValue(parent?.label))
        changes.dependsOn = parent ? parent.label : null;

      if (!Object.keys(changes).length) {
        record(report, "skipped", {
          row: rowNumber,
          column: "Label",
          value: label,
          reason: "Already exists with the same settings",
        });
        continue;
      }
      if (!dryRun) {
        await Attribute.updateOne({ uuid: existing.uuid }, { $set: changes });
      }
      record(report, "updated");
      continue;
    }

    const attribute = {
      uuid: uuid(),
      category: subCategory.category,
      subCategory: subCategory.uuid,
      label,
      filterType,
      visibleInFilter,
      ...(order !== undefined && { order }),
      dependsOn: parent ? parent.label : null,
    };
    if (!dryRun) {
      const created = await new Attribute(attribute).save();
      await SubCategory.updateOne(
        { uuid: subCategory.uuid },
        { $addToSet: { properties: created.uuid } }
      );
    }
    // Later rows may use this attribute as their parent.
    known.set(key, { ...attribute, _new: true });
    record(report, "created");
  }

  return report;
};

// --------------------------------------------------------- options import

const importOptions = async ({ subCategoryId, headers, rows, mode, dryRun }) => {
  const report = createReport();
  const { attributes } = await loadSubCategory(subCategoryId);
  const columns = orderedOptionAttributes(attributes);

  if (!columns.length) {
    report.fileErrors.push(
      "This sub-category has no select or checkbox attributes to import values into. Import attributes first."
    );
    return report;
  }

  // Map file columns to attributes; unknown columns stop the import.
  const byHeader = columnIndex(headers);
  const unknown = headers.filter(
    (header) =>
      !columns.some(
        (attribute) => normalizeValue(attribute.label) === normalizeValue(header)
      )
  );
  if (unknown.length) {
    report.fileErrors.push(
      `Unknown column(s): ${unknown.join(", ")}. Expected: ${columns
        .map((attribute) => attribute.label)
        .join(", ")}. Download a fresh template.`
    );
    return report;
  }
  const usedColumns = columns
    .map((attribute) => ({
      attribute,
      header: byHeader[normalizeValue(attribute.label)],
      parent: findParentAttribute(columns, attribute.dependsOn),
    }))
    .filter((column) => column.header);
  if (!usedColumns.length) {
    report.fileErrors.push("The file has no columns to import.");
    return report;
  }

  // Existing options, keyed by attribute + parent option + normalized value.
  const existingOptions = await AttributeOption.find({
    attributeId: { $in: usedColumns.map((column) => column.attribute.uuid) },
  }).lean();
  const optionKey = (attributeId, parentId, value) =>
    `${attributeId}|${parentId || ""}|${normalizeValue(value)}`;
  const options = new Map(
    existingOptions.map((option) => [
      optionKey(option.attributeId, option.parentId, option.value),
      option,
    ])
  );
  const countedInFile = new Set();

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    if (!usedColumns.some((column) => row[column.header])) continue;
    report.summary.rows += 1;

    // Option resolved for each attribute in this row, for its children.
    const resolved = new Map();

    for (const { attribute, header, parent } of usedColumns) {
      const value = cleanValue(row[header]);
      if (!value) continue;
      const issue = (reason) => ({ row: rowNumber, column: header, value, reason });

      if (value.length > MAX_VALUE_LENGTH) {
        record(report, "failed", issue(`Longer than ${MAX_VALUE_LENGTH} characters`));
        continue;
      }

      let parentOption = null;
      if (parent) {
        parentOption = resolved.get(parent.uuid);
        if (!parentOption) {
          record(
            report,
            "failed",
            issue(
              row[byHeader[normalizeValue(parent.label)]]
                ? `${parent.label} in this row could not be imported`
                : `${parent.label} is required in the same row`
            )
          );
          continue;
        }
      }

      const key = optionKey(attribute.uuid, parentOption?.uuid, value);
      const existing = options.get(key);

      if (countedInFile.has(key)) {
        // Same value again in this file: usually a parent repeated for each
        // child row. Reuse it; report it only if it stands alone.
        resolved.set(attribute.uuid, existing);
        const hasChildInRow = usedColumns.some(
          (column) => column.parent?.uuid === attribute.uuid && row[column.header]
        );
        if (!hasChildInRow) {
          record(report, "skipped", issue("Duplicate of an earlier row in this file"));
        }
        continue;
      }
      countedInFile.add(key);

      if (existing && !existing._new) {
        resolved.set(attribute.uuid, existing);
        if (mode === "update" && existing.value !== value) {
          // Same value with different spelling/casing: adopt the file's.
          if (!dryRun) {
            await AttributeOption.updateOne(
              { uuid: existing.uuid },
              { $set: { value } }
            );
            await AttributeOption.updateMany(
              { parentId: existing.uuid },
              { $set: { parentValue: value } }
            );
          }
          existing.value = value;
          record(report, "updated");
        } else {
          record(
            report,
            "skipped",
            issue(
              mode === "update"
                ? "Already exists with the same value"
                : "Already exists"
            )
          );
        }
        continue;
      }

      const option = {
        uuid: uuid(),
        attributeId: attribute.uuid,
        value,
        ...(parentOption && {
          parentId: parentOption.uuid,
          parentValue: parentOption.value,
        }),
      };
      if (!dryRun) {
        await AttributeOption.create(option);
      }
      const stored = { ...option, _new: true };
      options.set(key, stored);
      resolved.set(attribute.uuid, stored);
      record(report, "created");
    }
  }

  return report;
};

// ------------------------------------------------------------ entry point

const runImport = async ({ type, subCategoryId, filePath, mode, dryRun }) => {
  const { headers, rows } = parseSpreadsheet(filePath);
  if (!headers.length) {
    const report = createReport();
    report.fileErrors.push("The file is empty or its first row has no column names.");
    return report;
  }
  if (rows.length > MAX_ROWS) {
    const report = createReport();
    report.fileErrors.push(
      `The file has ${rows.length} rows; the limit is ${MAX_ROWS}. Split it into smaller files.`
    );
    return report;
  }

  if (type === "attributes") {
    const missing = ["Label", "Filter Type"].filter(
      (column) => !columnIndex(headers)[normalizeValue(column)]
    );
    if (missing.length) {
      const report = createReport();
      report.fileErrors.push(
        `Missing column(s): ${missing.join(", ")}. Download a fresh template.`
      );
      return report;
    }
    // Normalize header spelling to the template's.
    const byHeader = columnIndex(headers);
    const normalizedRows = rows.map((row) =>
      ATTRIBUTE_COLUMNS.reduce((out, column) => {
        out[column] = row[byHeader[normalizeValue(column)]] ?? "";
        return out;
      }, {})
    );
    return importAttributes({ subCategoryId, rows: normalizedRows, mode, dryRun });
  }

  return importOptions({ subCategoryId, headers, rows, mode, dryRun });
};

module.exports = {
  MAX_ROWS,
  buildTemplate,
  templateFile,
  runImport,
  parseSpreadsheet,
};
