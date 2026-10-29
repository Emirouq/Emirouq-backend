const jwt = require("jsonwebtoken");
const createError = require("http-errors");

const { accessSecret, refreshSecret, accessTokenLife, refreshTokenLife } =
  require("../config/keys").jwt;
const Token = require("../models/Token.model");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("../services/util/generate_token");
const UserModel = require("../models/User.model");
const AdminModel = require("../models/Admin.model");
const { permissionsFor } = require("../services/adminRbac");

const validateAccessToken = async (req, res, next) => {
  if (!req.headers["authorization"])
    return next(createError.Unauthorized("Please login first"));

  const bearerToken = req.headers["authorization"] || req.cookies?.auth;
  const token =
    bearerToken.split(" ")[0] === "Bearer"
      ? bearerToken.split(" ")[1]
      : bearerToken;

  jwt.verify(token, accessSecret, async (err, decoded) => {
    if (err) {
      if (err.message === "jwt expired") {
        if (req.cookies?.refresh) {
          const auth = req.cookies.refresh;

          try {
            const payload = jwt.verify(auth, refreshSecret);
            if (!payload)
              throw createError.Unauthorized(
                "Session expired. Please login again."
              );
            // A pre-2FA admin refresh token must not mint a new session.
            if (payload.role === "Admin" && payload.mfa !== true)
              throw createError.Unauthorized(
                "Please sign in again with two-factor authentication."
              );

            const resultQuery = await Token.findOne({
              // _userId: payload.data._id,
              token: auth,
            });
            if (!resultQuery)
              return next(createError.Unauthorized("Please login again"));

            const accessToken = generateAccessToken(payload, accessTokenLife);
            const refreshToken = generateRefreshToken(
              payload,
              refreshTokenLife
            );
            if (accessToken && refreshToken) {
              resultQuery.overwrite(
                new Token({
                  user: payload.id,
                  token: refreshToken,
                })
              );
              await resultQuery.save();
              res.cookie("auth", accessToken, { httpOnly: true });
              res.cookie("refresh", refreshToken, { httpOnly: true });
              const json_ = res.json; // capture the default resp.json implementation

              res.json = function (object) {
                object["accessToken"] = accessToken;

                json_.call(res, object);
              };
              req.user = payload;
              // Same admin checks as the normal path: still active, and
              // current permissions (roles may have changed).
              if (payload.role === "Admin") {
                const admin = await AdminModel.findOne({ uuid: payload.uuid });
                if (!admin || admin.isActive === false) {
                  return next(createError.Unauthorized("Your admin access has been revoked."));
                }
                Object.assign(req.user, await permissionsFor(admin), {
                  roles: admin.roles || [],
                });
              }
              return next();
            }
          } catch (error) {
            return next(createError.Unauthorized("Please login again"));
          }
        }
        return next(createError.Unauthorized("Please login again"));
      } else {
        const message =
          err.name === "JsonWebTokenError" ? "Unauthorized" : err.message;

        return next(createError.Unauthorized(message));
      }
    }
    // Every session token names its user. Without this, findOne({ uuid:
    // undefined }) below would match the first user / admin in the database.
    if (!decoded?.uuid) {
      return next(createError.Unauthorized("Please login again"));
    }
    // Admin sessions must come from the two-factor sign-in. Admin tokens
    // issued before 2FA (no mfa flag) are refused, so every admin signs in
    // again with a code.
    if (decoded.role === "Admin" && decoded.mfa !== true) {
      return next(
        createError.Unauthorized(
          "Please sign in again with two-factor authentication."
        )
      );
    }
    let user;
    let payload;
    if (decoded.role === "Admin") {
      user = await AdminModel.findOne({ uuid: decoded.uuid });
      // Revoked or removed staff lose access immediately, even with a
      // token that has not expired yet.
      if (!user || user.isActive === false) {
        return next(createError.Unauthorized("Your admin access has been revoked."));
      }
      const { permissions, isSuperAdmin } = await permissionsFor(user);
      payload = {
        _id: user?._id,
        uuid: user?.uuid,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
        role: "Admin",
        roles: user?.roles || [],
        permissions,
        isSuperAdmin,
      };
    } else {
      user = await UserModel.findOne(
        { uuid: decoded.uuid },
        {
          snapTrade: 0,
        }
      );
      payload = {
        _id: user?._id,
        uuid: user?.uuid,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
        accountName: user?.accountName,
        isActive: user?.isActive,
        isTrial: user?.isTrial,
        timeZone: user?.timeZone,
        role: user?.role,
      };
    }

    if (!user?.isActive && user?.role === "customer") {
      return next(createError.Unauthorized("User is not active"));
    }
    req.user = payload;
    next();
  });
};

module.exports = validateAccessToken;
