const router = require("express").Router();

const addPost = require("../../controllers/post/addPost");
const getPosts = require("../../controllers/post/getPosts");
const getSinglePost = require("../../controllers/post/getSinglePost");
const getAdsPost = require("../../controllers/post/getAdsPost");
const getFeaturedAds = require("../../controllers/post/getFeaturedAds");
const updatePost = require("../../controllers/post/updatePost");
const updatePostStatus = require("../../controllers/post/updatePostStatus");
const jwtValidation = require("../../middlewares/jwt_validation");
const addToFavourite = require("../../controllers/post/addToFavourite");
const getFavouritePosts = require("../../controllers/post/getFavouritePosts");
// const deletePost = require("../../controllers/post/deletePost");
const likePost = require("../../controllers/post/likePost");
const addComment = require("../../controllers/post/addComment");
const createSubscriptionForFeatureAd = require("../../controllers/post/createSubscriptionForFeatureAd");

router.post("/", jwtValidation, addPost);
router.get("/", getPosts);
router.get("/list", getAdsPost);
router.get("/:id", getSinglePost);
router.get("/featured-ads", getFeaturedAds);
router.put("/updateStatus/:id", jwtValidation, updatePostStatus);
router.put("/:id", jwtValidation, updatePost);
router.get("/favourite/get", jwtValidation, getFavouritePosts);
router.put("/favourite/:id", jwtValidation, addToFavourite);
// router.delete("/:id", jwtValidation, deletePost);
router.post("/like/:postId", jwtValidation, likePost);
router.post("/comment/:postId", jwtValidation, addComment);
router.post(
  "/createSubscriptionForFeatureAd/:postId",
  jwtValidation,
  createSubscriptionForFeatureAd
);
module.exports = router;
