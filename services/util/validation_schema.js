const Joi = require("joi");

const registerValidation = Joi.object({
  email: Joi.string().trim().email().lowercase(),
  phone: Joi.string()
    .trim()
    .regex(/^[0-9]{7,10}$/),
  name: Joi.string().min(3).max(24).required(),
  password: Joi.string().min(2).required(),
  role: Joi.string().valid("ROLE_CUSTOMER", "ROLE_ADMIN", "ROLE_EMPLOYEE"),
  website: Joi.string().min(2),
  bio: Joi.string().min(2).max(1000),
  gender: Joi.string().valid("male", "female", "others"),
});

module.exports = {
  registerValidation,
};
