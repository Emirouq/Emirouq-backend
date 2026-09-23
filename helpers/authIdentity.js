const createHttpError = require("http-errors");

/**
 * Helpers shared by every auth controller so that email/phone are matched,
 * validated and tokenised the same way everywhere.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD_LENGTH = 6;

/** Escapes a value so it cannot act as a regular expression. */
const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Anchored, case-insensitive exact match for an email.
 *
 * The controllers used `{ $regex: email }`, which is an unanchored substring
 * match: "bob@x.com" also matched "rob@x.com" and "bob@x.com.evil.net".
 */
const emailMatch = (email) => ({
  $regex: `^${escapeRegex(normalizeEmail(email))}$`,
  $options: "i",
});

/** Lower-cased, trimmed email, or undefined when nothing usable was given. */
function normalizeEmail(email) {
  const value = Array.isArray(email) ? email[0] : email;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toLowerCase();
  return trimmed || undefined;
}

/**
 * Digits with an optional leading `+`, so "+971 50 123 4567",
 * "+971-50-123-4567" and "971501234567" all normalise to one stored value.
 */
function normalizePhone(phoneNumber) {
  const value = Array.isArray(phoneNumber) ? phoneNumber[0] : phoneNumber;
  if (value === undefined || value === null) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return undefined;
  return `${hasPlus ? "+" : ""}${digits}`;
}

const isValidEmail = (email) => EMAIL_PATTERN.test(email || "");

/** 7–15 digits, matching the E.164 range. */
const isValidPhone = (phoneNumber) =>
  /^\+?\d{7,15}$/.test(phoneNumber || "");

/**
 * Normalises and validates the identity fields of a request body/form.
 * Exactly one of email / phoneNumber must be usable.
 */
function resolveIdentity({ email, phoneNumber }, { required = true } = {}) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phoneNumber);

  if (required && !normalizedEmail && !normalizedPhone) {
    throw createHttpError.BadRequest("Email or phone number is required.");
  }
  if (normalizedEmail && !isValidEmail(normalizedEmail)) {
    throw createHttpError.BadRequest("Please enter a valid email address.");
  }
  if (normalizedPhone && !isValidPhone(normalizedPhone)) {
    throw createHttpError.BadRequest("Please enter a valid phone number.");
  }

  return {
    email: normalizedEmail,
    phoneNumber: normalizedPhone,
    identifier: normalizedEmail || normalizedPhone,
    isEmail: Boolean(normalizedEmail),
  };
}

/** Mongo filter that finds a user by whichever identity was supplied. */
function identityFilter({ email, phoneNumber }) {
  if (email) return { email: emailMatch(email) };
  return { phoneNumber };
}

function assertPasswordStrength(password, confirmPassword) {
  if (typeof password !== "string" || !password) {
    throw createHttpError.BadRequest("Password is required.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw createHttpError.BadRequest(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    throw createHttpError.BadRequest("Passwords do not match!");
  }
}

/**
 * `<identifier>:<otp>`, base64. The OTP is the last segment so an identifier
 * containing ":" cannot shift the split.
 */
const encodeOtpToken = (identifier, otp) =>
  Buffer.from(`${identifier}:${otp}`).toString("base64");

function decodeOtpToken(token) {
  let text = "";
  try {
    text = Buffer.from(String(token || ""), "base64").toString("utf8");
  } catch {
    throw createHttpError.BadRequest("Invalid or expired verification link.");
  }
  const separator = text.lastIndexOf(":");
  if (separator === -1) {
    throw createHttpError.BadRequest("Invalid or expired verification link.");
  }
  const identifier = text.slice(0, separator).trim();
  const otp = text.slice(separator + 1).trim();
  if (!identifier || !otp) {
    throw createHttpError.BadRequest("Invalid or expired verification link.");
  }
  const isEmail = identifier.includes("@");
  return {
    identifier,
    otp,
    isEmail,
    email: isEmail ? normalizeEmail(identifier) : undefined,
    phoneNumber: isEmail ? undefined : normalizePhone(identifier),
  };
}

/**
 * Only echo an OTP back over HTTP when explicitly enabled for local work.
 * Returning it in production lets anyone reset anyone else's password.
 */
const shouldExposeOtp = () =>
  process.env.AUTH_EXPOSE_OTP === "true" && process.env.NODE_ENV !== "production";

module.exports = {
  MIN_PASSWORD_LENGTH,
  escapeRegex,
  emailMatch,
  normalizeEmail,
  normalizePhone,
  isValidEmail,
  isValidPhone,
  resolveIdentity,
  identityFilter,
  assertPasswordStrength,
  encodeOtpToken,
  decodeOtpToken,
  shouldExposeOtp,
};
