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

    // Close any active breaks
    if (attendance.breaks && attendance.breaks.length > 0) {
      attendance.breaks.forEach((b) => {
        if (!b.endTime) {
          b.endTime = now;
        }
      });
    }

    const punchIn = new Date(attendance.punchInTime);

    // Break ms (total break time taken today)
    let breakMsToday = 0;
    if (attendance.breaks && attendance.breaks.length > 0) {
      attendance.breaks.forEach((b) => {
        const start = new Date(b.startTime);
        const end = b.endTime ? new Date(b.endTime) : now;
        breakMsToday += end - start;
      });
    }

    // Office schedule enforcement: require punches to be inside 10am-6pm window
    // If punch-in is earlier than 10:00 or later than 18:00, we still allow punch-out but the day becomes "absent".
    const scheduleStart = new Date(punchIn);
    scheduleStart.setHours(10, 0, 0, 0);
    const scheduleEnd = new Date(punchIn);
    scheduleEnd.setHours(18, 0, 0, 0);

    const isInOfficeWindow = punchIn >= scheduleStart && punchIn <= scheduleEnd;

    // Net working ms for today (raw net; allowance is tracked monthly)
    const totalMsToday = now - punchIn;
    const rawNetMsToday = Math.max(0, totalMsToday - breakMsToday);
    const rawNetHoursToday = rawNetMsToday / (1000 * 60 * 60);

    // Monthly enforcement
    const year = now.getFullYear();
    const monthIndex = now.getMonth(); // 0-11
    const startOfMonth = dayjs().year(year).month(monthIndex).startOf("month").format("YYYY-MM-DD");
    const endOfMonth = dayjs().year(year).month(monthIndex).endOf("month").format("YYYY-MM-DD");

    // Count working days in month (Mon-Fri) => expected hours = workingDays * 8
    const firstDay = dayjs(startOfMonth);
    const lastDay = dayjs(endOfMonth);
    const workingDays = lastDay.diff(firstDay, 'day') + 1
      ? (() => {
          let cnt = 0;
          let cur = firstDay;
          while (cur.isBefore(lastDay) || cur.isSame(lastDay, 'day')) {
            const dow = cur.day();
            if (dow !== 0 && dow !== 6) cnt += 1;
            cur = cur.add(1, 'day');
          }
          return cnt;
        })()
      : 0;

    const expectedHoursMonth = workingDays * 8;

    // Sum month work hours already completed (including today) AFTER applying break allowance cap.
    // Rule: total break time allowed in month = 45 minutes, extra breaks reduce compensable net time by consuming deficit.
    const attendanceRecords = await Attendance.find({ userId, date: { $gte: startOfMonth, $lte: endOfMonth } }).lean();

    // Compute breaks used in month including (possibly) current attendance
    const breakMinutesMonthUsed = (() => {
      let ms = 0;
      for (const rec of attendanceRecords) {
        const breaks = rec.breaks || [];
        for (const b of breaks) {
          if (b.endTime && b.startTime) {
            ms += new Date(b.endTime) - new Date(b.startTime);
          }
        }
      }
      // include current attendance breaks even if not yet saved punchOut time (breaks are already closed above)
      for (const b of attendance.breaks || []) {
        if (b.endTime && b.startTime) {
          ms += new Date(b.endTime) - new Date(b.startTime);
        }
      }
      return ms / (1000 * 60);
    })();

    const BREAK_ALLOWANCE_MINUTES = 45;

    // Allowed break minutes apply globally per month. We convert to ms and cap month break deduction.
    const allowedBreakMsMonth = Math.min(breakMinutesMonthUsed, BREAK_ALLOWANCE_MINUTES) * 60 * 1000;

    // Compute month raw total elapsed ms (punch-out/in) and then apply allowance cap at month level.
    // For simplicity with current schema, we use each day's stored totalHours if exists (net after its breaks),
    // and then adjust using a deficit approach based on additional breaks beyond allowance.
    // Since the system currently stores totalHours as net-after-breaks, we approximate by treating *extra break minutes*
    // as uncompensated deduction from month hours.
    const extraBreakMinutes = Math.max(0, breakMinutesMonthUsed - BREAK_ALLOWANCE_MINUTES);
    const extraBreakHours = extraBreakMinutes / 60;

    // Current month totalHours stored already represent net-after-breaks. We reduce by extraBreakHours to enforce allowance.
    const monthNetHoursStored = attendanceRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);

    // If current record wasn't previously included in attendanceRecords totalHours yet, add rawNetHoursToday now.
    const monthNetHoursWithToday = monthNetHoursStored + rawNetHoursToday;
    const monthAdjustedHours = Math.max(0, monthNetHoursWithToday - extraBreakHours);

    // Determine if user has enough adjusted hours to be considered "completed" today; otherwise status can be short/absent but still valid for later compensation.
    // Always allow punchOut; status only reflects today's shortfall vs thresholds.
    const totalHoursTodayAdjusted = isInOfficeWindow
      ? parseFloat((Math.max(0, rawNetHoursToday)).toFixed(2))
      : 0;

    attendance.punchOutTime = now;
    attendance.totalHours = totalHoursTodayAdjusted;

    if (latitude && longitude) {
      attendance.punchOutLocation = { latitude, longitude };
    }

    if (reason) {
      attendance.punchOutReason = reason;
    }
    if (reasonType) {
      attendance.punchOutReasonType = reasonType;
    }

    // Status logic (keep existing thresholds but based on adjusted net hours today)
    if (totalHoursTodayAdjusted < 4) {
      attendance.status = "absent";
    } else if (totalHoursTodayAdjusted < 7) {
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
        breaks: attendance.breaks,
        // useful for frontend compensation messaging
        monthAdjustedHours: parseFloat(monthAdjustedHours.toFixed(2)),
        monthExpectedHours: expectedHoursMonth,
        monthDeficitHours: parseFloat(Math.max(0, expectedHoursMonth - monthAdjustedHours).toFixed(2)),
        breakAllowanceUsedMinutes: parseFloat(Math.min(breakMinutesMonthUsed, BREAK_ALLOWANCE_MINUTES).toFixed(0)),
        breakAllowanceExtraMinutes: parseFloat(extraBreakMinutes.toFixed(0)),
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
          breaks: [],
          isOnBreak: false,
        },
      });
    }

    const hasPunchOut = !!attendance.punchOutTime;
    const isOnBreak = attendance.breaks ? attendance.breaks.some(b => !b.endTime) : false;

    let status = attendance.status;
    if (isOnBreak) {
      status = "on_break";
    } else if (!hasPunchOut && status === "on_duty") {
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
        breaks: attendance.breaks || [],
        isOnBreak,
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
      breaks: r.breaks || [],
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
    if (!['super_admin', 'admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
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
      breaks: r.breaks || [],
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

// Start Break
const startBreak = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id || req.user.id;
    const today = getTodayString();

    const attendance = await Attendance.findOne({ userId, date: today });

    if (!attendance || !attendance.punchInTime) {
      return res.status(400).json({
        success: false,
        message: "You must punch in before starting a break",
      });
    }

    if (attendance.punchOutTime) {
      return res.status(400).json({
        success: false,
        message: "Already punched out for today",
      });
    }

    const activeBreak = attendance.breaks.find(b => !b.endTime);
    if (activeBreak) {
      return res.status(400).json({
        success: false,
        message: "You are already on a break",
      });
    }

    attendance.breaks.push({ startTime: new Date() });
    await attendance.save();

    res.json({
      success: true,
      message: "Break started successfully",
      data: {
        breaks: attendance.breaks,
        isOnBreak: true,
      },
    });
  } catch (error) {
    console.error("Start break error:", error);
    res.status(500).json({ success: false, message: "Server error starting break" });
  }
};

// End Break
const endBreak = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id || req.user.id;
    const today = getTodayString();

    const attendance = await Attendance.findOne({ userId, date: today });

    if (!attendance || !attendance.punchInTime) {
      return res.status(400).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    if (attendance.punchOutTime) {
      return res.status(400).json({
        success: false,
        message: "Already punched out for today",
      });
    }

    const activeBreak = attendance.breaks.find(b => !b.endTime);
    if (!activeBreak) {
      return res.status(400).json({
        success: false,
        message: "You are not currently on a break",
      });
    }

    activeBreak.endTime = new Date();
    
    // Recalculate total hours (subtracting active breaks)
    const now = new Date();
    const punchInTime = new Date(attendance.punchInTime);
    let totalMs = now - punchInTime;

    let breakMs = 0;
    if (attendance.breaks && attendance.breaks.length > 0) {
      attendance.breaks.forEach(b => {
        const start = new Date(b.startTime);
        const end = b.endTime ? new Date(b.endTime) : now;
        breakMs += (end - start);
      });
    }
    const netMs = Math.max(0, totalMs - breakMs);
    attendance.totalHours = parseFloat((netMs / (1000 * 60 * 60)).toFixed(2));

    await attendance.save();

    res.json({
      success: true,
      message: "Break ended successfully",
      data: {
        breaks: attendance.breaks,
        isOnBreak: false,
        totalHours: attendance.totalHours,
      },
    });
  } catch (error) {
    console.error("End break error:", error);
    res.status(500).json({ success: false, message: "Server error ending break" });
  }
};

module.exports = {
  punchIn,
  punchOut,
  getAttendanceStatus,
  getMyAttendance,
  getAllAttendance,
  startBreak,
  endBreak,
};

