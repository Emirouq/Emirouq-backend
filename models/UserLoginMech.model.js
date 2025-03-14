const { Schema, model } = require("mongoose");

const loginMechSchema = new Schema({
  //uuid of the user
  user: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});

const UserLoginMech = model("UserLoginMech", loginMechSchema, "userLoginMech");

module.exports = UserLoginMech;
