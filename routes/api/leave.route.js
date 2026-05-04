const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const {
  applyLeave,
  getMyLeaveBalance,
  getMyLeaves,
  cancelLeave,
  getPendingLeaves,
  getAllLeaves,
  approveLeave,
  rejectLeave,
  getLeaveStats,
} = require("../../controller/Leave/leaveController");

router.post("/apply", protect, applyLeave);
router.get("/my/balance", protect, getMyLeaveBalance);
router.get("/my", protect, getMyLeaves);
router.delete("/cancel/:id", protect, cancelLeave);
router.get("/pending", protect, getPendingLeaves);
router.get("/all", protect, getAllLeaves);
router.patch("/approve/:id", protect, approveLeave);
router.patch("/reject/:id", protect, rejectLeave);
router.get("/stats", protect, getLeaveStats);

module.exports = router;

