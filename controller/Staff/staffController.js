const User = require("../../models/Auth/User");
const Department = require("../../models/Department");
const Attendance = require("../../models/Attendance");
const Leave = require("../../models/Leave");
const bcrypt = require("bcryptjs");
const dayjs = require("dayjs");
const mongoose = require("mongoose");
const { sendStaffWelcomeEmail } = require("../../services/emailService");

// Get Staff Stats
const getStaffStats = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || dayjs().year();
    const month = parseInt(req.query.month) || dayjs().month() + 1;

    const startOfMonth = dayjs(`${year}-${month}-01`).format("YYYY-MM-DD");
    const endOfMonth = dayjs(`${year}-${month}-01`).endOf("month").format("YYYY-MM-DD");

    // Total staff count
    const totalStaff = await User.countDocuments({
      role: { $in: ["admin", "hr", "employee"] },
      $or: [
        { deletedAt: null },
        { deletedAt: { $exists: false } }
      ]
    });

    // Active staff (those who have attendance this month)
    const activeStaffIds = await Attendance.distinct("userId", {
      date: { $gte: startOfMonth, $lte: endOfMonth },
      punchInTime: { $ne: null },
    });
    const activeStaff = activeStaffIds.length;

    // Today's attendance
    const today = dayjs().format("YYYY-MM-DD");
    const todayAttendance = await Attendance.find({ date: today }).lean();
    const presentToday = todayAttendance.filter(
      (a) => a.status === "present" || a.status === "late" || a.status === "completed" || a.status === "on_duty"
    ).length;
    const absentToday = todayAttendance.filter((a) => a.status === "absent").length;
    const onLeaveToday = await Leave.countDocuments({
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
      status: "approved",
    });

    // Monthly attendance rate
    const monthAttendance = await Attendance.find({
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).lean();

    const workingDays = dayjs(endOfMonth).date();
    const totalExpected = totalStaff * workingDays;
    const totalPresent = monthAttendance.filter(
      (a) => a.status === "present" || a.status === "late" || a.status === "completed"
    ).length;
    const attendanceRate = totalExpected > 0 ? Math.round((totalPresent / totalExpected) * 100) : 0;

    // Pending leave requests
    const pendingLeaves = await Leave.countDocuments({ status: "pending" });

    // Average working hours this month
    const avgHours =
      monthAttendance.length > 0
        ? (
            monthAttendance.reduce((sum, a) => sum + (a.totalHours || 0), 0) /
            monthAttendance.length
          ).toFixed(2)
        : 0;

    // Role breakdown
    const staffByRole = await User.aggregate([
      { 
        $match: { 
          role: { $in: ["admin", "hr", "employee"] },
          $or: [
            { deletedAt: null },
            { deletedAt: { $exists: false } }
          ]
        } 
      },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        totalStaff,
        activeStaff,
        presentToday,
        absentToday,
        onLeaveToday,
        attendanceRate,
        pendingLeaves,
        avgHours: parseFloat(avgHours),
        month: dayjs(`${year}-${month}-01`).format("MMMM YYYY"),
        staffByRole: staffByRole.map((r) => ({
          role: r._id,
          count: r.count,
        })),
      },
    });
  } catch (error) {
    console.error("Get staff stats error:", error);
    res.status(500).json({ success: false, message: "Server error fetching staff stats" });
  }
};

// Add Staff
const addStaff = async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin/HR access only' });
    }

    const {
      name,
      email,
      phone,
      address,
      status,
      systemRole,
      role,
      department,
      designation,
      dateOfJoining,
      reportingTo,
      employeeType,
      salaryStructure,
      documents
    } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Name, email and phone are required' });
    }

    // Normalization helper for documents
    const normalizeDocument = (doc) => {
      if (!doc) return '';
      if (typeof doc === 'string') return doc;
      if (Array.isArray(doc)) {
        if (doc.length === 0) return '';
        const first = doc[0];
        return first?.url || first?.thumbUrl || first?.preview || '';
      }
      if (typeof doc === 'object') {
        return doc.url || '';
      }
      return '';
    };

    if (documents) {
      const docKeys = ['identityProof', 'educationalCertificate', 'offerLetter', 'medicalDocument'];
      docKeys.forEach(key => {
        documents[key] = normalizeDocument(documents[key]);
      });
    }


    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const tempPassword = phone;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    const finalRole = systemRole || role || 'employee';

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone: phone || '',
      address: address || '',
      role: finalRole,
      isTemp: status === 'Inactive',
      status: status === 'Inactive' ? 'inactive' : 'active',
      tempExpiry: status === 'Inactive' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
      department: department || '',
      designation: designation || '',
      dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
      reportingTo: reportingTo || null,
      employeeType: employeeType || 'full_time',
      salaryStructure: salaryStructure || {},
      documents: documents || {}
    });

    const dashboardLink = 'https://admin.unrealstudiozz.com/';
    await sendStaffWelcomeEmail(email, name, tempPassword, dashboardLink);

    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      department: user.department,
      designation: user.designation,
      dateOfJoining: user.dateOfJoining,
      reportingTo: user.reportingTo,
      employeeType: user.employeeType,
      salaryStructure: user.salaryStructure,
      documents: user.documents,
    };

    res.status(201).json({
      success: true,
      message: 'Staff added successfully',
      staff: safeUser,
    });
  } catch (error) {
    console.error('Add staff error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get All Staff
const getAllStaff = async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin/HR access only' });
    }

    const staff = await User.find({
      role: { $in: ['admin', 'hr', 'employee'] },
      $or: [
        { deletedAt: null },
        { deletedAt: { $exists: false } }
      ]
    })
      .select('name email phone address role status isTemp createdAt department designation dateOfJoining reportingTo employeeType salaryStructure documents moduleVisibility permissions')
      .lean()
      .sort({ createdAt: -1 });

    const staffList = staff.map(s => ({
      key: s._id,
      id: s._id,
      name: s.name,
      email: s.email,
      phone: s.phone || '',
      address: s.address || '',
      role: s.role,
      status: s.status === 'inactive' || s.isTemp ? 'Inactive' : 'Active',
      joined: s.dateOfJoining ? new Date(s.dateOfJoining).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      createdAt: s.createdAt,
      department: s.department || '',
      designation: s.designation || '',
      dateOfJoining: s.dateOfJoining || null,
      reportingTo: s.reportingTo || null,
      employeeType: s.employeeType || 'full_time',
      salaryStructure: s.salaryStructure || {},
      documents: s.documents || {},
      moduleVisibility: s.moduleVisibility || [],
      permissions: s.permissions || []
    }));

    res.json({
      success: true,
      staff: staffList,
    });
  } catch (error) {
    console.error('Get all staff error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get Staff By ID
const getStaffById = async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin/HR access only' });
    }

    const { id } = req.params;

    const user = await User.findById(id)
      .select('name email phone address role status isTemp createdAt department designation dateOfJoining reportingTo employeeType salaryStructure documents moduleVisibility permissions')
      .lean();

    if (!user || !['admin', 'hr', 'employee'].includes(user.role)) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    res.json({
      success: true,
      staff: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        role: user.role,
        status: user.status === 'inactive' || user.isTemp ? 'Inactive' : 'Active',
        joined: user.dateOfJoining ? new Date(user.dateOfJoining).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: user.createdAt,
        department: user.department || '',
        designation: user.designation || '',
        dateOfJoining: user.dateOfJoining || null,
        reportingTo: user.reportingTo || null,
        employeeType: user.employeeType || 'full_time',
        salaryStructure: user.salaryStructure || {},
        documents: user.documents || {},
        moduleVisibility: user.moduleVisibility || [],
        permissions: user.permissions || [],
      },
    });
  } catch (error) {
    console.error('Get staff by id error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update Staff
const updateStaff = async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin/HR access only' });
    }

    // Extract staff ID from URL param or request body
    const id = req.params.id || req.body.id;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Staff ID is required' });
    }
    // Validate ObjectId
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid staff ID' });
    }
    const {
      name,
      email,
      phone,
      address,
      status,
      systemRole,
      role,
      department,
      designation,
      dateOfJoining,
      reportingTo,
      employeeType,
      salaryStructure,
      documents,
      moduleVisibility,
      permissions,
    } = req.body;

    // Normalization helper for documents
    const normalizeDocument = (doc) => {
      if (!doc) return '';
      if (typeof doc === 'string') return doc;
      if (Array.isArray(doc)) {
        if (doc.length === 0) return '';
        const first = doc[0];
        return first?.url || first?.thumbUrl || first?.preview || '';
      }
      if (typeof doc === 'object') {
        return doc.url || '';
      }
      return '';
    };

    if (documents) {
      const docKeys = ['identityProof', 'educationalCertificate', 'offerLetter', 'medicalDocument'];
      docKeys.forEach(key => {
        documents[key] = normalizeDocument(documents[key]);
      });
    }

    if (email) {

      const existing = await User.findOne({
        email,
        _id: { $ne: id },
        $or: [
          { deletedAt: null },
          { deletedAt: { $exists: false } }
        ]
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (status !== undefined) {
      updateData.isTemp = status === 'Inactive';
      updateData.status = status === 'Inactive' ? 'inactive' : 'active';
    }
    const finalRole = systemRole || role;
    if (finalRole) updateData.role = finalRole;
    if (department !== undefined) updateData.department = department;
    if (designation !== undefined) updateData.designation = designation;
    if (dateOfJoining !== undefined) updateData.dateOfJoining = dateOfJoining ? new Date(dateOfJoining) : null;
    if (reportingTo !== undefined) updateData.reportingTo = reportingTo || null;
    if (employeeType !== undefined) updateData.employeeType = employeeType;
    if (salaryStructure !== undefined) updateData.salaryStructure = salaryStructure;
    if (documents !== undefined) updateData.documents = documents;
// Add permissions if provided
    if (permissions !== undefined) updateData.permissions = permissions;


    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('name email phone address role status isTemp createdAt department designation dateOfJoining reportingTo employeeType salaryStructure documents moduleVisibility permissions');

    if (!user || !['admin', 'hr', 'employee'].includes(user.role)) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    res.json({
      success: true,
      message: 'Staff updated successfully',
      staff: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        role: user.role,
        status: user.status === 'inactive' || user.isTemp ? 'Inactive' : 'Active',
        joined: user.dateOfJoining ? new Date(user.dateOfJoining).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: user.createdAt,
        department: user.department || '',
        designation: user.designation || '',
        dateOfJoining: user.dateOfJoining || null,
        reportingTo: user.reportingTo || null,
        employeeType: user.employeeType || 'full_time',
        salaryStructure: user.salaryStructure || {},
        documents: user.documents || {},
        moduleVisibility: user.moduleVisibility || [],
        permissions: user.permissions || [],
      },
    });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete Staff
const deleteStaff = async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin/HR access only' });
    }

    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true }
    ).lean();

    if (!user || !['admin', 'hr', 'employee'].includes(user.role)) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    res.json({
      success: true,
      message: 'Staff removed successfully',
    });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all unique departments
const getDepartments = async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin/HR access only' });
    }

    const userDepartments = await User.distinct("department", {
      department: { $ne: "" },
      role: { $in: ["admin", "hr", "employee"] },
      $or: [
        { deletedAt: null },
        { deletedAt: { $exists: false } }
      ]
    });

    const customDepts = await Department.find({}).lean();
    const customDeptNames = customDepts.map(d => d.name);

    const defaultDepartments = ["Engineering", "HR", "Marketing", "Sales", "Design", "Finance", "Operations"];
    const uniqueDepartments = Array.from(
      new Set(
        [...userDepartments, ...customDeptNames, ...defaultDepartments]
          .map(d => d.trim())
          .filter(Boolean)
      )
    );

    res.json({
      success: true,
      data: uniqueDepartments,
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Add a new Department
const addDepartment = async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin/HR access only' });
    }

    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Department name is required' });
    }

    const normalizedName = name.trim();

    // Check if it already exists (case-insensitive) in Department model
    const existingDept = await Department.findOne({
      name: { $regex: new RegExp(`^${normalizedName}$`, 'i') }
    });

    if (existingDept) {
      return res.status(400).json({ success: false, message: 'Department already exists' });
    }

    // Save to database
    const newDept = await Department.create({
      name: normalizedName,
      description: description || "",
      createdBy: req.user.userId || req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Department added successfully',
      data: newDept
    });
  } catch (error) {
    console.error('Add department error:', error);
    res.status(500).json({ success: false, message: 'Server error adding department' });
  }
};

module.exports = {
  getStaffStats,
  addStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  getDepartments,
  addDepartment,
};
