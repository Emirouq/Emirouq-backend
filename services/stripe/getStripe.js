const { secretKey } = require("../../config/keys").stripe;
const stripe = require("stripe")(secretKey);
module.exports = stripe;
