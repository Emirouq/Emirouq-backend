const router = require("express").Router();

const addPost = require("../../controllers/post/addPost");
const getPosts = require("../../controllers/post/getPosts");
const getSinglePost = require("../../controllers/post/getSinglePost");
const getAdsPost = require("../../controllers/post/getAdsPost");
const getPostCount = require("../../controllers/post/getPostCount");
const getFeaturedAds = require("../../controllers/post/getFeaturedAds");
const updatePost = require("../../controllers/post/updatePost");
const updatePostStatus = require("../../controllers/post/updatePostStatus");
const addToFavourite = require("../../controllers/post/addToFavourite");
const getFavouritePosts = require("../../controllers/post/getFavouritePosts");
// const deletePost = require("../../controllers/post/deletePost");
const likePost = require("../../controllers/post/likePost");
const addComment = require("../../controllers/post/addComment");
const createSubscriptionForFeatureAd = require("../../controllers/post/createSubscriptionForFeatureAd");
const getPostsByCategory = require("../../controllers/post/getPostsByCategory");
const getDashboardPost = require("../../controllers/post/getDashboardPost");

router.get("/get-dashboard-post", getDashboardPost);
router.get("/", getPosts);
router.get("/featured-ads", getFeaturedAds);
router.get("/list", getAdsPost);
router.get("/count", getPostCount);
router.get("/:id", getSinglePost);
const jwtValidation = require("../../middlewares/jwt_validation");
const { requirePermission } = require("../../middlewares/requirePermission");
const deletePost = require("../../controllers/post/deletePost");
const countViewPost = require("../../controllers/post/countViewPost");
router.get("/:categoryId/similar", getPostsByCategory);
router.post("/", jwtValidation, addPost);
// Approve / reject / take down: admins with ad moderation rights only. Any
// signed-in user could call this before, including to approve their own ad.
router.put(
  "/updateStatus/:id",
  jwtValidation,
  requirePermission("posts", "approve"),
  updatePostStatus
);
router.put("/:id", jwtValidation, updatePost);
router.get("/favourite/get", jwtValidation, getFavouritePosts);
router.put("/favourite/:id", jwtValidation, addToFavourite);
// router.delete("/:id", jwtValidation, deletePost);
router.post("/like/:postId", jwtValidation, likePost);
router.post("/comment/:postId", jwtValidation, addComment);
router.delete("/:id", jwtValidation, deletePost);
router.post(
  "/createSubscriptionForFeatureAd/:postId",
  jwtValidation,
  createSubscriptionForFeatureAd,
);
router.get("/count-view-post/:postId", jwtValidation, countViewPost);
module.exports = router;
