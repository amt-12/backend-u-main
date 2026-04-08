const Student = require("../../models/Student.model");
const StudentRegistration = require("../../models/StudentRegistration.model");
const InternshipApplication = require("../../models/InternshipApplication");
const College = require("../../models/College");

/**
 * Get all students
 * GET /api/student/all
 */
const getAllStudents = async (req, res, next) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: { students }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all student registrations (from StudentRegistration model)
 * GET /api/student/registrations
 */
const getRegistrations = async (req, res, next) => {
  try {
    const registrations = await StudentRegistration.find()
      .populate('college', 'name')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: { registrations }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get students by college ID
 * GET /api/student/by-college
 */
const getStudentsByCollege = async (req, res, next) => {
  try {
    const { collegeId } = req.query;
    if (!collegeId) {
      return res.status(400).json({ success: false, message: 'College ID is required' });
    }

    const college = await College.findById(collegeId);
    if (!college) {
      return res.status(404).json({ success: false, message: 'College not found' });
    }

    const students = await Student.find({ college: college.name }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: { students }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student by email
 * GET /api/student/by-email
 */
const getStudentByEmail = async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({
      success: true,
      data: { student }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register a new student
 * POST /api/student/register
 */
const registerStudent = async (req, res, next) => {
  try {
    const { fullName, email, phone, college, technology, course, semester, passingYear } = req.body;

    // Check if student already exists
    let student = await Student.findOne({ email });
    
    if (student) {
      return res.status(200).json({
        success: true,
        message: 'Student already registered',
        data: { student }
      });
    }

    // Create new student
    student = await Student.create({
      fullName,
      email,
      phone,
      college,
      technology,
      course,
      semester,
      passingYear
    });

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: { student }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update student by email
 * PUT /api/student/by-email
 */
const updateStudentByEmail = async (req, res, next) => {
  try {
    const { email, ...updateData } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const student = await Student.findOneAndUpdate(
      { email },
      { $set: updateData },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: { student }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete student by email
 * DELETE /api/student/by-email
 */
const deleteStudentByEmail = async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const student = await Student.findOneAndDelete({ email });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send test invitation to students
 * POST /api/student/send-test-invite
 */
const sendTestInvite = async (req, res, next) => {
  try {
    const { studentIds, baseUrl } = req.body;
    
    // This is a placeholder for the actual email sending logic
    // In a real scenario, you would Loop through studentIds, fetch details, and send emails via a service.
    
    res.json({
      success: true,
      message: `Test invitation sent to ${studentIds.length} students`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllStudents,
  getRegistrations,
  getStudentsByCollege,
  getStudentByEmail,
  registerStudent,
  updateStudentByEmail,
  deleteStudentByEmail,
  sendTestInvite
};
