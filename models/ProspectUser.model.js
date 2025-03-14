var mongoose = require("mongoose");
var Schema = mongoose.Schema;
const { refreshTokenLife } = require("../config/keys").jwt;

// create a schema
var prospectUserSchema = new Schema({
  uuid: {
    type: String,
    required: false,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  userHandle: {
    type: String,
    // unique: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    // unique: true,
  },
  token: { type: String, required: true },
  createdAt: {
    type: Date,
    expires: refreshTokenLife,
    default: Date.now,
  },
});
// the schema is useless so far
// we need to create a model using it
var ProspectUser = mongoose.model(
  "ProspectUser",
  prospectUserSchema,
  "prospectUser"
);

// make this available to our users in our Node applications
module.exports = ProspectUser;
