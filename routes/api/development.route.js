const express = require("express");
const { protect } = require("../../middleware/authMiddleware");
const {
  getMyTrainings,
  updateProgress,
  assignDevelopment,
  getAllStaffTrainings
} = require("../../controller/Development/developmentController");

const router = express.Router();

// All development routes are protected
router.use(protect);

router.get("/my-trainings", getMyTrainings);
router.patch("/progress/:trainingId", updateProgress);
router.post("/assign", assignDevelopment);
router.get("/all", getAllStaffTrainings);

module.exports = router;
