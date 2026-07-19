const User = require("../../models/Auth/User");
const s3Service = require("../../services/s3Service");

// Get Staff Profile
const getStaffProfile = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId)
      .select("name email phone address profileImage role status createdAt department designation dateOfJoining reportingTo employeeType salaryStructure documents moduleVisibility permissions")
      .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Don't return if soft-deleted
    if (user.deletedAt) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is staff/admin
    if (!['super_admin', 'admin', 'manager', 'executive'].includes(user.role)) {
      return res.status(403).json({ error: "Access denied. Staff only." });
    }

    const profileImageUrl = user.profileImage
      ? await s3Service.generateSignedUrl(user.profileImage)
      : null;

    res.json({
      success: true,
      user: {
        id: user._id,
        fullName: user.name,
        email: user.email,
        phone: user.phone || "",
        address: user.address || "",
        profileImage: profileImageUrl,
        role: user.role,
        status: user.status,
        joined: user.createdAt,
        department: user.department || "",
        designation: user.designation || "",
        dateOfJoining: user.dateOfJoining || null,
        reportingTo: user.reportingTo || null,
        employeeType: user.employeeType || "full_time",
        salaryStructure: user.salaryStructure || {},
        documents: user.documents || {},
        moduleVisibility: user.moduleVisibility || [],
        permissions: user.permissions || [],
      },
    });
  } catch (error) {
    console.error("Get staff profile error:", error);
    res.status(500).json({ error: "Server error fetching staff profile" });
  }
};

// Update Staff Profile
const updateStaffProfile = async (req, res) => {
  try {
    const { name, phone, address, moduleVisibility } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (moduleVisibility !== undefined) updateData.moduleVisibility = moduleVisibility;

    const userId = req.user.userId || req.user._id;
    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("name email phone address profileImage role status createdAt department designation dateOfJoining reportingTo employeeType salaryStructure documents moduleVisibility permissions")

    if (!user || user.deletedAt) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!['super_admin', 'admin', 'manager', 'executive'].includes(user.role)) {
      return res.status(403).json({ error: "Access denied. Staff only." });
    }

    res.json({
      success: true,
      message: "Staff profile updated successfully",
      user: {
        id: user._id,
        fullName: user.name,
        email: user.email,
        phone: user.phone || "",
        address: user.address || "",
        profileImage: user.profileImage,
        role: user.role,
        status: user.status,
        joined: user.createdAt,
        department: user.department || "",
        designation: user.designation || "",
        dateOfJoining: user.dateOfJoining || null,
        reportingTo: user.reportingTo || null,
        employeeType: user.employeeType || "full_time",
        salaryStructure: user.salaryStructure || {},
        documents: user.documents || {},
        moduleVisibility: user.moduleVisibility || [],
        permissions: user.permissions || [],
      },
    });
  } catch (error) {
    console.error("Update staff profile error:", error);
    res.status(500).json({ error: "Server error updating staff profile" });
  }
};

module.exports = {
  getStaffProfile,
  updateStaffProfile,
};

