const dayjs = require('dayjs');
const Attendance = require('../../models/Attendance');
const User = require('../../models/Auth/User');

const getWorkingDaysInMonth = (startOfMonth, endOfMonth) => {
  let cnt = 0;
  let cur = dayjs(startOfMonth);
  const last = dayjs(endOfMonth);
  while (cur.isBefore(last) || cur.isSame(last, 'day')) {
    const dow = cur.day(); // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) cnt += 1;
    cur = cur.add(1, 'day');
  }
  return cnt;
};

const clampNetHoursWithBreakAllowance = ({
  monthAttendance,
  expectedHoursMonth,
  breakAllowanceMinutes = 45,
}) => {
  // Current schema stores totalHours as net-after-breaks per day.
  // We need to apply the monthly 45 min break cap: extra break minutes beyond cap should reduce payable/adjusted hours.
  // Best-effort approximation: compute total break minutes from attendance.breaks and deduct extra.
  let breakMinutesUsed = 0;

  for (const rec of monthAttendance) {
    const breaks = rec.breaks || [];
    for (const b of breaks) {
      if (b.startTime && b.endTime) {
        breakMinutesUsed += (new Date(b.endTime) - new Date(b.startTime)) / (1000 * 60);
      }
    }
  }

  const extraBreakMinutes = Math.max(0, breakMinutesUsed - breakAllowanceMinutes);
  const extraBreakHours = extraBreakMinutes / 60;

  const monthNetHoursStored = monthAttendance.reduce((sum, r) => sum + (r.totalHours || 0), 0);
  const monthAdjustedHours = Math.max(0, monthNetHoursStored - extraBreakHours);
  const monthDeficitHours = Math.max(0, expectedHoursMonth - monthAdjustedHours);

  return {
    breakMinutesUsed,
    breakAllowanceMinutes,
    extraBreakMinutes,
    monthAdjustedHours,
    monthDeficitHours,
  };
};

// GET /payroll/summary?month=MM&year=YYYY
// Returns rows used by u-admin-panel Payroll.tsx
const getPayrollSummary = async (req, res) => {
  try {
    // basic role check: allow super_admin and admin only
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const month = parseInt(req.query.month, 10) || (dayjs().month() + 1);
    const year = parseInt(req.query.year, 10) || dayjs().year();

    const startOfMonth = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('YYYY-MM-DD');
    const endOfMonth = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');

    const workingDays = getWorkingDaysInMonth(startOfMonth, endOfMonth);
    const expectedHoursMonth = workingDays * 8;

    const users = await User.find({ role: { $in: ['manager', 'executive'] } })
      .select('name email department role salaryStructure')
      .lean();

    // For each employee, fetch attendance records in month
    const rows = await Promise.all(
      users.map(async (u) => {
        const monthAttendance = await Attendance.find({ userId: u._id, date: { $gte: startOfMonth, $lte: endOfMonth } }).lean();

        const { monthAdjustedHours, monthDeficitHours } = clampNetHoursWithBreakAllowance({
          monthAttendance,
          expectedHoursMonth,
          breakAllowanceMinutes: 45,
        });

        // Payable hours must not exceed expected required hours for the month
        const payableHours = Math.min(monthAdjustedHours, expectedHoursMonth);

        // Salary computation: use salaryStructure baseSalary (per month) prorated by payable/expected
        const salaryStructure = u.salaryStructure || {};
        const baseSalary = Number(salaryStructure.baseSalary || 0);
        const hra = Number(salaryStructure.hra || 0);
        const transport = Number(salaryStructure.transport || 0);
        const other = Number(salaryStructure.other || 0);
        const taxDeduction = Number(salaryStructure.taxDeduction || 0);
        const pf = Number(salaryStructure.pf || 0);

        const grossMonthly = baseSalary + hra + transport + other;
        const totalDeductions = taxDeduction + pf;
        const netMonthly = grossMonthly - totalDeductions;

        const payableAmount = expectedHoursMonth > 0 ? (netMonthly * payableHours) / expectedHoursMonth : 0;

        return {
          userId: u._id.toString(),
          name: u.name,
          email: u.email,
          department: u.department,
          expectedHours: expectedHoursMonth,
          workedHours: Number(monthAdjustedHours.toFixed(2)),
          deficitHours: Number(monthDeficitHours.toFixed(2)),
          payableHours: Number(payableHours.toFixed(2)),
          payableAmount: Number(payableAmount.toFixed(2)),
        };
      })
    );

    res.json({ success: true, data: { rows } });
  } catch (e) {
    console.error('getPayrollSummary error:', e);
    res.status(500).json({ success: false, message: 'Server error getting payroll summary' });
  }
};

module.exports = { getPayrollSummary };

