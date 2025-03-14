const createHttpError = require("http-errors");
const ProspectUser = require("../../models/ProspectUser.model");
const User = require("../../models/User.model");
const crypto = require("crypto");
const { algorithm, initVector, securitykey } =
  require("../../config/keys").emailverifyKey;

const verifyToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    // Decrypt the token
    const decipher = crypto.createDecipheriv(
      algorithm,
      securitykey,
      initVector
    );

    // Decrypt the token
    let decryptedUserId = decipher.update(token, "hex", "utf-8");

    // Finalize the decryption
    decryptedUserId += decipher.final("utf8");

    // Check if the token is valid
    const verifyUser = await ProspectUser.findOne({
      token: token,
      uuid: decryptedUserId,
    });
    if (!verifyUser) {
      throw createHttpError.BadRequest("Invalid token");
    }
    res.status(200).send({ data: verifyUser });
  } catch (err) {
    next(err);
  }
};

module.exports = verifyToken;
