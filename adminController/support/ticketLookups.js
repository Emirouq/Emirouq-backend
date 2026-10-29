const { userLookup } = require("../../helpers/userProjection");

const ADMIN_USER_PROJECTION = {
  _id: 0,
  uuid: 1,
  firstName: 1,
  lastName: 1,
  email: 1,
  phoneNumber: 1,
  profileImage: 1,
  isActive: 1,
};

/** Joins reporter, reported user and reported ad onto tickets. */
const ticketLookups = [
  userLookup({ localField: "user", as: "reporter", projection: ADMIN_USER_PROJECTION }),
  { $unwind: { path: "$reporter", preserveNullAndEmptyArrays: true } },
  userLookup({
    localField: "reportedUserId",
    as: "reportedUser",
    projection: ADMIN_USER_PROJECTION,
  }),
  { $unwind: { path: "$reportedUser", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "posts",
      localField: "postId",
      foreignField: "uuid",
      pipeline: [
        {
          $project: {
            _id: 0,
            uuid: 1,
            title: 1,
            status: 1,
            price: 1,
            userId: 1,
            file: { $slice: ["$file", 1] },
          },
        },
      ],
      as: "post",
    },
  },
  { $unwind: { path: "$post", preserveNullAndEmptyArrays: true } },
];

const adminName = (user) =>
  `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Admin";

module.exports = { ticketLookups, adminName };
