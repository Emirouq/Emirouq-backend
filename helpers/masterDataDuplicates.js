/**
 * Duplicate rules for category master data (attributes and their options).
 *
 * Two values are the same when they match ignoring case and extra spaces:
 * "Toyota", "toyota " and "TOYOTA" are one brand. Used by the bulk import and
 * by the manual add/update routes, so both enforce the same rule.
 */

/** Trim and collapse inner whitespace; keeps the admin's casing. */
const cleanValue = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

/** Comparison key: cleaned and lower-cased. */
const normalizeValue = (value) => cleanValue(value).toLowerCase();

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Mongo filter value matching `value` ignoring case and spacing, for one field.
 * e.g. { value: sameValueRegex("Land  Rover") } matches "land rover".
 */
const sameValueRegex = (value) =>
  new RegExp(
    `^\\s*${cleanValue(value)
      .split(" ")
      .map(escapeRegex)
      .join("\\s+")}\\s*$`,
    "i"
  );

module.exports = { cleanValue, normalizeValue, sameValueRegex };
