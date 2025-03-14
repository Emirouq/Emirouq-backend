const router = require("express").Router();

// bring in models and controllers
//create Section
const addUniversity = require("../../adminController/university/addUniversitySection");
const deleteSection = require("../../adminController/university/deleteData");
const getDetails = require("../../adminController/university/getAllSections");
const getSingleSection = require("../../adminController/university/getSingleSection");
// upload video
const uploadVideo = require("../../adminController/university/uploadVideo");

router.post("/", addUniversity);
router.get("/", getDetails);
router.put("/upload/:id", uploadVideo);
router.get("/:sectionId", getSingleSection);
router.delete("/:sectionId", deleteSection);

module.exports = router;
