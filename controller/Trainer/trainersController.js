const Trainer = require('../../models/Trainer');
const Batch = require('../../models/Batch');

// @desc    Get all trainers
// @route   GET /api/trainers
// @access  Private
const getTrainers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, specialization } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (status) query.status = status;
    if (specialization) query.specialization = { $regex: specialization, $options: 'i' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } }
      ];
    }

    const trainers = await Trainer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Trainer.countDocuments(query);

    res.json({
      success: true,
      data: trainers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get trainers error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// @desc    Get single trainer
// @route   GET /api/trainers/:id
// @access  Private
const getTrainerById = async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id);

    if (!trainer) {
      return res.status(404).json({ success: false, error: 'Trainer not found' });
    }

    res.json({
      success: true,
      data: trainer
    });
  } catch (error) {
    console.error('Get trainer error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// @desc    Create new trainer
// @route   POST /api/trainers
// @access  Private (Admin)
const createTrainer = async (req, res) => {
  try {
    const { name, email, phone, specialization, status, courses, students, rating, batches } = req.body;

    // Validation
    if (!name || !email || !phone || !specialization) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, phone and specialization are required'
      });
    }

    // Check for duplicate email
    const existingTrainer = await Trainer.findOne({ email: email.toLowerCase().trim() });
    if (existingTrainer) {
      return res.status(400).json({ success: false, error: 'Trainer with this email already exists' });
    }

    // Build batch references if provided
    let batchData = [];
    if (batches && batches.length > 0) {
      const batchIds = batches.map(b => typeof b === 'string' ? b : b._id);
      const foundBatches = await Batch.find({ _id: { $in: batchIds } }).lean();
      batchData = foundBatches.map(b => ({
        _id: b._id,
        name: b.name,
        course: b.course || '',
        timeSlots: b.timeSlots || []
      }));
    }

    const trainer = new Trainer({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      specialization: specialization.trim(),
      status: status || 'active',
      courses: courses || 0,
      students: students || 0,
      rating: rating || 0,
      batches: batchData
    });

    const savedTrainer = await trainer.save();

    res.status(201).json({
      success: true,
      message: 'Trainer created successfully',
      data: savedTrainer
    });
  } catch (error) {
    console.error('Create trainer error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// @desc    Update trainer
// @route   PUT /api/trainers/:id
// @access  Private (Admin)
const updateTrainer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, specialization, status, courses, students, rating, batches } = req.body;

    const trainer = await Trainer.findById(id);
    if (!trainer) {
      return res.status(404).json({ success: false, error: 'Trainer not found' });
    }

    // Check duplicate email if changing
    if (email && email.toLowerCase().trim() !== trainer.email) {
      const existing = await Trainer.findOne({ email: email.toLowerCase().trim(), _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ success: false, error: 'Email already in use by another trainer' });
      }
      trainer.email = email.toLowerCase().trim();
    }

    // Update fields
    if (name) trainer.name = name.trim();
    if (phone) trainer.phone = phone.trim();
    if (specialization) trainer.specialization = specialization.trim();
    if (status) trainer.status = status;
    if (courses !== undefined) trainer.courses = courses;
    if (students !== undefined) trainer.students = students;
    if (rating !== undefined) trainer.rating = rating;

    // Update batch references if provided
    if (batches !== undefined) {
      if (batches.length > 0) {
        const batchIds = batches.map(b => typeof b === 'string' ? b : b._id);
        const foundBatches = await Batch.find({ _id: { $in: batchIds } }).lean();
        trainer.batches = foundBatches.map(b => ({
          _id: b._id,
          name: b.name,
          course: b.course || '',
          timeSlots: b.timeSlots || []
        }));
      } else {
        trainer.batches = [];
      }
    }

    const updatedTrainer = await trainer.save();

    res.json({
      success: true,
      message: 'Trainer updated successfully',
      data: updatedTrainer
    });
  } catch (error) {
    console.error('Update trainer error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// @desc    Delete trainer
// @route   DELETE /api/trainers/:id
// @access  Private (Admin)
const deleteTrainer = async (req, res) => {
  try {
    const { id } = req.params;

    const trainer = await Trainer.findById(id);
    if (!trainer) {
      return res.status(404).json({ success: false, error: 'Trainer not found' });
    }

    await Trainer.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Trainer deleted successfully'
    });
  } catch (error) {
    console.error('Delete trainer error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = {
  getTrainers,
  getTrainerById,
  createTrainer,
  updateTrainer,
  deleteTrainer
};

