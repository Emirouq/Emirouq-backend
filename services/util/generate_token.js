const jwt = require("jsonwebtoken");
const createError = require("http-errors");
const crypto = require("crypto");

const { accessSecret, refreshSecret, accessTokenLife, refreshTokenLife } =
  require("../../config/keys").jwt;

const generateAccessToken = (user, expiresIn = accessTokenLife) => {
  const payload = {
    ...user,
    iat: Date.now(),
    type: "access",
  };
  const token = jwt.sign(payload, accessSecret, { expiresIn });
  if (!token) return createError.InternalServerError();
  return token;
};

const generateRefreshToken = (user, expiresIn = refreshTokenLife) => {
  const payload = {
    ...user,
    iat: Date.now(),
    type: "refresh",
  };
  const token = jwt.sign(payload, refreshSecret, { expiresIn });
  if (!token) return createError.InternalServerError();
  return token;
};

const generateCryptoKey = () => crypto.randomBytes(32).toString("hex");

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateCryptoKey,
};
