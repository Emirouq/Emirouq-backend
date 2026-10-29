/**
 * What one user may see about ANOTHER user.
 *
 * Aggregations used to `$lookup` the whole user document, so chat lists, ad
 * pages (even without login) and profile views returned the other person's
 * password hash, email, Stripe customer id, OAuth id and favourites. Every
 * lookup of someone else's user record goes through one of these instead.
 */

/** Seller / chat partner / commenter. Phone stays: buyers call sellers. */
const PUBLIC_USER_PROJECTION = {
  _id: 0,
  uuid: 1,
  firstName: 1,
  lastName: 1,
  profileImage: 1,
  userHandle: 1,
  bio: 1,
  phoneNumber: 1,
  countryCode: 1,
  isActive: 1,
  createdAt: 1,
};

/** For admin and own-account views: everything except secrets. */
const SECRET_USER_FIELDS_PROJECTION = {
  password: 0,
  oauthId: 0,
};

/**
 * `$lookup` of a user by uuid that only returns `projection`.
 *
 * @param {{ localField: string, as: string, projection?: object }} options
 */
const userLookup = ({
  localField,
  as,
  projection = PUBLIC_USER_PROJECTION,
}) => ({
  $lookup: {
    from: "user",
    localField,
    foreignField: "uuid",
    pipeline: [{ $project: projection }],
    as,
  },
});

/** Keeps only PUBLIC_USER_PROJECTION's fields of a plain user object. */
const toPublicUser = (user) =>
  user
    ? Object.fromEntries(
        Object.keys(PUBLIC_USER_PROJECTION)
          .filter((key) => key !== "_id" && user[key] !== undefined)
          .map((key) => [key, user[key]])
      )
    : user;

module.exports = {
  PUBLIC_USER_PROJECTION,
  SECRET_USER_FIELDS_PROJECTION,
  userLookup,
  toPublicUser,
};
