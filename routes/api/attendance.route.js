const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const {
  punchIn,
  punchOut,
  getAttendanceStatus,
  getMyAttendance,
  getAllAttendance,
} = require("../../controller/Attendance/attendanceController");

router.post("/punch-in", protect, punchIn);
router.post("/punch-out", protect, punchOut);
router.get("/status", protect, getAttendanceStatus);
router.get("/", protect, getMyAttendance);
router.get("/all", protect, getAllAttendance);

module.exports = router;

