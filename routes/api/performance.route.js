const express = require("express");
const { protect } = require("../../middleware/authMiddleware");
const {
  getPerformanceStats,
  getMyReviews,
  getMyGoals
} = require("../../controller/Performance/performanceController");

const router = express.Router();

// All performance routes are protected
router.use(protect);

router.get("/stats", getPerformanceStats);
router.get("/my", getMyReviews);
router.get("/goals", getMyGoals);

module.exports = router;
