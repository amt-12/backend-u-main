const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const {
  punchIn,
  punchOut,
  getAttendanceStatus,
  getMyAttendance,
  getAllAttendance,
  startBreak,
  endBreak,
} = require("../../controller/Attendance/attendanceController");

router.post("/punch-in", protect, punchIn);
router.post("/punch-out", protect, punchOut);
router.get("/status", protect, getAttendanceStatus);
router.get("/", protect, getMyAttendance);
router.get("/all", protect, getAllAttendance);
router.post("/break-start", protect, startBreak);
router.post("/break-end", protect, endBreak);

module.exports = router;

