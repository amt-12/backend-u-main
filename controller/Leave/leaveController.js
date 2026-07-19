const Leave = require("../../models/Leave");
const User = require("../../models/Auth/User");
const dayjs = require("dayjs");

// Default leave balances per month
const DEFAULT_BALANCE = {
  casual: { total: 2, taken: 0, remaining: 2 },
  sick: { total: 2, taken: 0, remaining: 2 },
  paid: { total: 2, taken: 0, remaining: 2 },
};

// Helper: Get working days in a range, grouped by "YYYY-MM"
const getWorkingDaysByMonth = (startDate, endDate) => {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const months = {}; // format: "YYYY-MM": count

  let current = start;
  while (current.isBefore(end) || current.isSame(end, "day")) {
    const dayOfWeek = current.day(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const key = current.format("YYYY-MM");
      months[key] = (months[key] || 0) + 1;
    }
    current = current.add(1, "day");
  }
  return months;
};

// Helper: Get user's leave balance for a given year and month (defaults to current month)
const getUserLeaveBalance = async (staffId, year, month) => {
  const targetYear = year || dayjs().year();
  const targetMonth = month || (dayjs().month() + 1);

  // Format month key: YYYY-MM
  const monthStr = targetMonth.toString().padStart(2, '0');
  const monthKey = `${targetYear}-${monthStr}`;

  // Find all approved or pending leaves for this staff
  const leaves = await Leave.find({
    staffId,
    status: { $in: ["approved", "pending"] },
  }).lean();

  let casualTaken = 0;
  let sickTaken = 0;
  let paidTaken = 0;

  for (const leave of leaves) {
    const usage = getWorkingDaysByMonth(leave.startDate, leave.endDate);
    const daysInMonth = usage[monthKey] || 0;
    
    if (daysInMonth > 0) {
      if (leave.leaveType === "casual") {
        casualTaken += daysInMonth;
      } else if (leave.leaveType === "sick") {
        sickTaken += daysInMonth;
      } else if (leave.leaveType === "paid") {
        paidTaken += daysInMonth;
      }
    }
  }

  const totalTaken = casualTaken + sickTaken + paidTaken;
  const remaining = Math.max(0, 2 - totalTaken);

  return {
    casual: {
      total: 2,
      taken: casualTaken,
      remaining: remaining,
    },
    sick: {
      total: 2,
      taken: sickTaken,
      remaining: remaining,
    },
    paid: {
      total: 2,
      taken: paidTaken,
      remaining: remaining,
    },
  };
};

// Apply for leave
const applyLeave = async (req, res) => {
  try {
    const staffId = req.user.userId || req.user._id || req.user.id;
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const start = dayjs(startDate);
    const end = dayjs(endDate);

    if (end.isBefore(start)) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    // Calculate working days by month
    const newLeaveUsage = getWorkingDaysByMonth(startDate, endDate);
    const totalWorkingDays = Object.values(newLeaveUsage).reduce((sum, days) => sum + days, 0);

    if (totalWorkingDays <= 0) {
      return res.status(400).json({
        success: false,
        message: "Selected date range must include at least one working day (Monday - Friday)",
      });
    }

    // Check balance for each month in the range
    for (const [monthKey, newDays] of Object.entries(newLeaveUsage)) {
      const [y, m] = monthKey.split("-").map(Number);
      const balance = await getUserLeaveBalance(staffId, y, m);
      
      if (balance[leaveType].remaining < newDays) {
        const monthName = dayjs(`${monthKey}-01`).format("MMMM YYYY");
        return res.status(400).json({
          success: false,
          message: `Insufficient leave balance for ${monthName}. Remaining limit: ${balance[leaveType].remaining} days. Requested in this month: ${newDays} days.`,
        });
      }
    }

    // Fetch the start month balance snapshot to save
    const startMonthKey = start.format("YYYY-MM");
    const [startYear, startMonth] = startMonthKey.split("-").map(Number);
    const startBalance = await getUserLeaveBalance(staffId, startYear, startMonth);

    const leave = new Leave({
      staffId,
      leaveType,
      startDate: start.toDate(),
      endDate: end.toDate(),
      totalDays: totalWorkingDays,
      reason,
      year: start.year(),
      balanceSnapshot: {
        casual: Math.max(0, startBalance.casual.remaining - (newLeaveUsage[startMonthKey] || 0)),
        sick: Math.max(0, startBalance.sick.remaining - (newLeaveUsage[startMonthKey] || 0)),
        paid: Math.max(0, startBalance.paid.remaining - (newLeaveUsage[startMonthKey] || 0)),
      },
    });

    await leave.save();
    await leave.populate("staffId", "name email role");

    res.status(201).json({
      success: true,
      message: "Leave application submitted successfully",
      data: formatLeave(leave),
    });
  } catch (error) {
    console.error("Apply leave error:", error);
    res.status(500).json({ success: false, message: "Server error applying for leave" });
  }
};

// Get My Leave Balance
const getMyLeaveBalance = async (req, res) => {
  try {
    const staffId = req.user.userId || req.user._id || req.user.id;
    const year = parseInt(req.query.year) || dayjs().year();
    const month = parseInt(req.query.month) || (dayjs().month() + 1);

    const balance = await getUserLeaveBalance(staffId, year, month);

    res.json({
      success: true,
      data: {
        balance,
        currentYear: year,
        currentMonth: month,
      },
    });
  } catch (error) {
    console.error("Get leave balance error:", error);
    res.status(500).json({ success: false, message: "Server error fetching leave balance" });
  }
};

// Get My Leaves
const getMyLeaves = async (req, res) => {
  try {
    const staffId = req.user.userId || req.user._id || req.user.id;
    const { status, year = dayjs().year() } = req.query;

    const query = { staffId, year: parseInt(year) };
    if (status && status !== "all") {
      query.status = status;
    }

    const leaves = await Leave.find(query)
      .populate("staffId", "name email role")
      .populate("approvedBy", "name email")
      .sort({ appliedOn: -1 })
      .lean();

    res.json({
      success: true,
      data: leaves.map(formatLeave),
    });
  } catch (error) {
    console.error("Get my leaves error:", error);
    res.status(500).json({ success: false, message: "Server error fetching leaves" });
  }
};

// Cancel Leave
const cancelLeave = async (req, res) => {
  try {
    const staffId = req.user.userId || req.user._id || req.user.id;
    const { id } = req.params;

    const leave = await Leave.findOne({ _id: id, staffId });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    if (leave.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Can only cancel pending leave requests",
      });
    }

    leave.status = "cancelled";
    await leave.save();

    res.json({
      success: true,
      message: "Leave request cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel leave error:", error);
    res.status(500).json({ success: false, message: "Server error cancelling leave" });
  }
};

// Get Pending Leaves (for approvers)
const getPendingLeaves = async (req, res) => {
  try {
    if (!['super_admin', 'admin', 'manager', 'executive'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const leaves = await Leave.find({ status: "pending" })
      .populate("staffId", "name email role")
      .sort({ appliedOn: -1 })
      .lean();

    res.json({
      success: true,
      data: leaves.map(formatLeave),
    });
  } catch (error) {
    console.error("Get pending leaves error:", error);
    res.status(500).json({ success: false, message: "Server error fetching pending leaves" });
  }
};

// Get All Leaves
const getAllLeaves = async (req, res) => {
  try {
    if (!['super_admin', 'admin', 'manager', 'executive'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { status, leaveType, department, year = dayjs().year(), month } = req.query;

    const query = { year: parseInt(year) };

    if (status && status !== "all") {
      query.status = status;
    }

    if (leaveType) {
      query.leaveType = leaveType;
    }

    let leaves = await Leave.find(query)
      .populate("staffId", "name email role")
      .populate("approvedBy", "name email")
      .sort({ appliedOn: -1 })
      .lean();

    if (department) {
      leaves = leaves.filter((l) => l.staffId?.role === department);
    }

    if (month) {
      leaves = leaves.filter((l) => dayjs(l.startDate).month() + 1 === parseInt(month));
    }

    res.json({
      success: true,
      data: leaves.map(formatLeave),
    });
  } catch (error) {
    console.error("Get all leaves error:", error);
    res.status(500).json({ success: false, message: "Server error fetching all leaves" });
  }
};

// Approve Leave
const approveLeave = async (req, res) => {
  try {
    if (!['super_admin', 'admin', 'manager', 'executive'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const approverId = req.user.userId || req.user._id || req.user.id;
    const { id } = req.params;

    const leave = await Leave.findById(id).populate("staffId", "name email role");

    if (!leave) {
      return res.status(404).json({ success: false, message: "Leave request not found" });
    }

    if (leave.status !== "pending") {
      return res.status(400).json({ success: false, message: "Leave request is not pending" });
    }

    // Cannot approve own leave
    if (leave.staffId && leave.staffId._id.toString() === approverId.toString()) {
      return res.status(400).json({ success: false, message: "You cannot approve your own leave request" });
    }

    // Manager/Executive leaves must be approved by super_admin or admin
    if (leave.staffId && ['manager', 'executive'].includes(leave.staffId.role) && !['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Manager/Executive leaves must be approved by admin" });
    }

    leave.status = "approved";
    leave.approvedBy = approverId;
    leave.approvedAt = new Date();
    await leave.save();
    await leave.populate("approvedBy", "name email");

    res.json({
      success: true,
      message: "Leave request approved",
      data: formatLeave(leave),
    });
  } catch (error) {
    console.error("Approve leave error:", error);
    res.status(500).json({ success: false, message: "Server error approving leave" });
  }
};

// Reject Leave
const rejectLeave = async (req, res) => {
  try {
    if (!['super_admin', 'admin', 'manager', 'executive'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const approverId = req.user.userId || req.user._id || req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    const leave = await Leave.findById(id).populate("staffId", "name email role");

    if (!leave) {
      return res.status(404).json({ success: false, message: "Leave request not found" });
    }

    if (leave.status !== "pending") {
      return res.status(400).json({ success: false, message: "Leave request is not pending" });
    }

    // Cannot reject own leave
    if (leave.staffId && leave.staffId._id.toString() === approverId.toString()) {
      return res.status(400).json({ success: false, message: "You cannot reject your own leave request" });
    }

    // Manager/Executive leaves must be rejected by super_admin or admin
    if (leave.staffId && ['manager', 'executive'].includes(leave.staffId.role) && !['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Manager/Executive leaves must be rejected by admin" });
    }

    leave.status = "rejected";
    leave.rejectionReason = reason || "Rejected by admin";
    await leave.save();

    res.json({
      success: true,
      message: "Leave request rejected",
      data: formatLeave(leave),
    });
  } catch (error) {
    console.error("Reject leave error:", error);
    res.status(500).json({ success: false, message: "Server error rejecting leave" });
  }
};

// Get Leave Stats
const getLeaveStats = async (req, res) => {
  try {
    if (!['super_admin', 'admin', 'manager', 'executive'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const year = parseInt(req.query.year) || dayjs().year();

    const allLeaves = await Leave.find({ year }).lean();

    const stats = {
      total: allLeaves.length,
      pending: allLeaves.filter((l) => l.status === "pending").length,
      approved: allLeaves.filter((l) => l.status === "approved").length,
      rejected: allLeaves.filter((l) => l.status === "rejected").length,
      byType: {
        casual: allLeaves.filter((l) => l.leaveType === "casual").length,
        sick: allLeaves.filter((l) => l.leaveType === "sick").length,
        paid: allLeaves.filter((l) => l.leaveType === "paid").length,
      },
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get leave stats error:", error);
    res.status(500).json({ success: false, message: "Server error fetching leave stats" });
  }
};

// Helper: Format leave for response
function formatLeave(leave) {
  return {
    _id: leave._id,
    staffId: leave.staffId
      ? {
          _id: leave.staffId._id,
          fullName: leave.staffId.name,
          email: leave.staffId.email,
          department: leave.staffId.role || "General",
          role: leave.staffId.role,
        }
      : null,
    leaveType: leave.leaveType,
    startDate: leave.startDate,
    endDate: leave.endDate,
    totalDays: leave.totalDays,
    reason: leave.reason,
    status: leave.status,
    appliedOn: leave.appliedOn,
    approvedBy: leave.approvedBy
      ? {
          _id: leave.approvedBy._id,
          fullName: leave.approvedBy.name,
          email: leave.approvedBy.email,
        }
      : null,
    approvedAt: leave.approvedAt,
    rejectionReason: leave.rejectionReason,
    balanceSnapshot: leave.balanceSnapshot,
  };
}

module.exports = {
  applyLeave,
  getMyLeaveBalance,
  getMyLeaves,
  cancelLeave,
  getPendingLeaves,
  getAllLeaves,
  approveLeave,
  rejectLeave,
  getLeaveStats,
};

