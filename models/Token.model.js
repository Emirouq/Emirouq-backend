const { Schema, model } = require("mongoose");

const { refreshTokenLife } = require("../config/keys").jwt;

const tokenSchema = new Schema({
  user: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    expires: refreshTokenLife,
    default: Date.now,
  },
});

const Token = model("token", tokenSchema, "token");

module.exports = Token;
