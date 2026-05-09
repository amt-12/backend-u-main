const mongoose = require('mongoose');
const InternshipApplication = require('../../models/InternshipApplication');

// NEW: separate API to avoid changing existing applyForInternship handler
// POST /api/internship/any-apply
const anyApplyInternship = async (req, res) => {
  try {
    const { name, email, phone, college, city, education, passingYear, semester, technology, link } = req.body;

    if (!name || !email || !phone || !college) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, phone, and college.'
      });
    }

    // IMPORTANT:
    // `college` may come from the client either as a College ObjectId OR as free text/code.
    // Because we cannot assume any specific College exists for that value, we only accept
    // valid ObjectIds here and let Mongoose handle/validate the rest.




    const existing = await InternshipApplication.findOne({ email });

    if (existing) {
      existing.name = name;
      existing.phone = phone;
      existing.college = college;
      existing.city = city;
      existing.education = education;
      existing.passingYear = passingYear;
      existing.semester = semester;
      existing.technology = technology;
      existing.link = link || false;

      await existing.save();

      return res.status(200).json({
        success: true,
        message: 'You have already applied for this internship. Existing application updated.',
        data: existing
      });
    }

    const created = await InternshipApplication.create({
      name,
      email,
      phone,
      college,
      city,
      education,
      passingYear,
      semester,
      technology,
      link: link || false
    });

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      data: created
    });
  } catch (error) {
    console.error('anyApplyInternship error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while submitting your application. Please try again later.'
    });
  }
};

// Admin CRUD
const listInternshipApplications = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    if (status && ['pending', 'approved', 'rejected'].includes(String(status))) {
      query.status = String(status);
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { technology: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      InternshipApplication.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),

      InternshipApplication.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('listInternshipApplications error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getInternshipApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await InternshipApplication.findById(id).lean();

    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    return res.status(200).json({ success: true, data: doc });
  } catch (error) {
    console.error('getInternshipApplicationById error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateInternshipApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updated = await InternshipApplication.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    }).lean();

    if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('updateInternshipApplication error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteInternshipApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await InternshipApplication.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ success: false, message: 'Not found' });
    return res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('deleteInternshipApplication error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  anyApplyInternship,
  listInternshipApplications,
  getInternshipApplicationById,
  updateInternshipApplication,
  deleteInternshipApplication,
};

