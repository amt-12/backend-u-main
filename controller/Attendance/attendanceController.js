const Attendance = require("../../models/Attendance");
const User = require("../../models/Auth/User");
const dayjs = require("dayjs");

// Helper: Get today's date string
const getTodayString = () => dayjs().format("YYYY-MM-DD");

// Punch In
const punchIn = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id || req.user.id;
    const { latitude, longitude } = req.body;
    const today = getTodayString();

    let attendance = await Attendance.findOne({ userId, date: today });

    if (attendance && attendance.punchInTime) {
      return res.status(400).json({
        success: false,
        message: "Already punched in today",
      });
    }

    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    const isLate = hour > 9 || (hour === 9 && minutes > 30);

    if (!attendance) {
      attendance = new Attendance({
        userId,
        date: today,
        punchInTime: now,
        status: isLate ? "late" : "on_duty",
        punchInLocation: latitude && longitude ? { latitude, longitude } : undefined,
      });
    } else {
      attendance.punchInTime = now;
      attendance.status = isLate ? "late" : "on_duty";
      if (latitude && longitude) {
        attendance.punchInLocation = { latitude, longitude };
      }
    }

    await attendance.save();

    res.json({
      success: true,
      message: "Punched in successfully",
      data: {
        punchInTime: attendance.punchInTime,
        status: attendance.status,
      },
    });
  } catch (error) {
    console.error("Punch in error:", error);
    res.status(500).json({ success: false, message: "Server error during punch in" });
  }
};

// Punch Out
const punchOut = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id || req.user.id;
    const { latitude, longitude, reason, reasonType } = req.body;
    const today = getTodayString();

    const attendance = await Attendance.findOne({ userId, date: today });

    if (!attendance || !attendance.punchInTime) {
      return res.status(400).json({
        success: false,
        message: "You haven't punched in today",
      });
    }

    if (attendance.punchOutTime) {
      return res.status(400).json({
        success: false,
        message: "Already punched out today",
      });
    }

    const now = new Date();
    const punchIn = new Date(attendance.punchInTime);
    const diffMs = now - punchIn;
    const totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    attendance.punchOutTime = now;
    attendance.totalHours = totalHours;

    if (latitude && longitude) {
      attendance.punchOutLocation = { latitude, longitude };
    }

    if (reason) {
      attendance.punchOutReason = reason;
    }
    if (reasonType) {
      attendance.punchOutReasonType = reasonType;
    }

    // Determine status
    if (totalHours < 4) {
      attendance.status = "absent";
    } else if (totalHours < 7) {
      if (reasonType === "half_day") {
        attendance.status = "pending_half_day";
      } else {
        attendance.status = "short_leave";
      }
    } else {
      attendance.status = "completed";
    }

    await attendance.save();

    res.json({
      success: true,
      message: "Punched out successfully",
      data: {
        punchOutTime: attendance.punchOutTime,
        totalHours: attendance.totalHours,
        status: attendance.status,
      },
    });
  } catch (error) {
    console.error("Punch out error:", error);
    res.status(500).json({ success: false, message: "Server error during punch out" });
  }
};

// Get Current Attendance Status
const getAttendanceStatus = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id || req.user.id;
    const today = getTodayString();

    const attendance = await Attendance.findOne({ userId, date: today });

    if (!attendance || !attendance.punchInTime) {
      return res.json({
        success: true,
        data: {
          status: "off_duty",
          punchInTime: null,
          punchOutTime: null,
          totalHours: 0,
          canApplyHalfDay: false,
          hasPunchOut: false,
          date: today,
        },
      });
    }

    const hasPunchOut = !!attendance.punchOutTime;

    let status = attendance.status;
    if (!hasPunchOut && status === "on_duty") {
      status = "on_duty";
    } else if (hasPunchOut) {
      status = attendance.status === "on_duty" ? "completed" : attendance.status;
    }

    res.json({
      success: true,
      data: {
        status,
        punchInTime: attendance.punchInTime,
        punchOutTime: attendance.punchOutTime,
        totalHours: attendance.totalHours || 0,
        canApplyHalfDay: !hasPunchOut,
        hasPunchOut,
        date: today,
      },
    });
  } catch (error) {
    console.error("Get attendance status error:", error);
    res.status(500).json({ success: false, message: "Server error fetching attendance status" });
  }
};

// Get My Attendance Records
const getMyAttendance = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id || req.user.id;
    const { month, year, page = 1, limit = 10 } = req.query;

    const query = { userId };

    if (month && year) {
      const startOfMonth = dayjs(`${year}-${month}-01`).format("YYYY-MM-DD");
      const endOfMonth = dayjs(`${year}-${month}-01`).endOf("month").format("YYYY-MM-DD");
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (year) {
      query.date = { $regex: `^${year}` };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Attendance.countDocuments(query),
    ]);

    // Calculate summary
    const allRecords = await Attendance.find({ userId }).lean();
    const presentDays = allRecords.filter(
      (r) => r.status === "present" || r.status === "late" || r.status === "completed"
    ).length;
    const absentDays = allRecords.filter((r) => r.status === "absent").length;
    const totalHours = allRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);

    const formattedRecords = records.map((r) => ({
      id: r._id,
      date: r.date,
      formattedDate: dayjs(r.date).format("DD MMM YYYY"),
      punchInTime: r.punchInTime,
      formattedPunchInTime: r.punchInTime
        ? dayjs(r.punchInTime).format("hh:mm A")
        : null,
      punchOutTime: r.punchOutTime,
      formattedPunchOutTime: r.punchOutTime
        ? dayjs(r.punchOutTime).format("hh:mm A")
        : null,
      totalHours: r.totalHours || 0,
      status: r.status,
      punchInLocation: r.punchInLocation,
      punchOutLocation: r.punchOutLocation,
      notes: r.notes,
      punchOutReason: r.punchOutReason,
      punchOutReasonType: r.punchOutReasonType,
      punchOutApprovalStatus: r.punchOutApprovalStatus,
    }));

    res.json({
      success: true,
      data: {
        attendances: formattedRecords,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalRecords: total,
          hasNext: skip + records.length < total,
          hasPrev: parseInt(page) > 1,
        },
        summary: {
          totalDays: allRecords.length,
          presentDays,
          absentDays,
          totalHours: parseFloat(totalHours.toFixed(2)),
        },
      },
    });
  } catch (error) {
    console.error("Get my attendance error:", error);
    res.status(500).json({ success: false, message: "Server error fetching attendance records" });
  }
};

// Get All Staff Attendance (Admin/HR)
const getAllAttendance = async (req, res) => {
  try {
    const { month, year, page = 1, limit = 10, status } = req.query;

    const query = {};

    if (month && year) {
      const startOfMonth = dayjs(`${year}-${month}-01`).format("YYYY-MM-DD");
      const endOfMonth = dayjs(`${year}-${month}-01`).endOf("month").format("YYYY-MM-DD");
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate("userId", "name email role")
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Attendance.countDocuments(query),
    ]);

    const formattedRecords = records.map((r) => ({
      id: r._id,
      date: r.date,
      formattedDate: dayjs(r.date).format("DD MMM YYYY"),
      punchInTime: r.punchInTime,
      formattedPunchInTime: r.punchInTime
        ? dayjs(r.punchInTime).format("hh:mm A")
        : null,
      punchOutTime: r.punchOutTime,
      formattedPunchOutTime: r.punchOutTime
        ? dayjs(r.punchOutTime).format("hh:mm A")
        : null,
      totalHours: r.totalHours || 0,
      status: r.status,
      punchInLocation: r.punchInLocation,
      punchOutLocation: r.punchOutLocation,
      notes: r.notes,
      staff: r.userId
        ? {
            fullName: r.userId.name,
            email: r.userId.email,
            department: r.userId.role || "General",
          }
        : null,
    }));

    res.json({
      success: true,
      data: {
        attendances: formattedRecords,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalRecords: total,
          hasNext: skip + records.length < total,
          hasPrev: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all attendance error:", error);
    res.status(500).json({ success: false, message: "Server error fetching staff attendance" });
  }
};

module.exports = {
  punchIn,
  punchOut,
  getAttendanceStatus,
  getMyAttendance,
  getAllAttendance,
};

