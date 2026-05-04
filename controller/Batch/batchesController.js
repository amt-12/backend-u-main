const Batch = require('../../models/Batch');

// @desc    Get all batches
// @route   GET /api/batches
// @access  Private
const getBatches = async (req, res) => {
  try {
    const { status, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { course: { $regex: search, $options: 'i' } }
      ];
    }

    const batches = await Batch.find(query)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: batches
    });
  } catch (error) {
    console.error('Get batches error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// @desc    Create a new batch
// @route   POST /api/batches
// @access  Private
const createBatch = async (req, res) => {
  try {
    const { name, course, timeSlots, status } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Batch name is required' });
    }

    const batch = await Batch.create({ name, course, timeSlots, status });

    res.status(201).json({
      success: true,
      data: batch
    });
  } catch (error) {
    console.error('Create batch error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = {
  getBatches,
  createBatch
};

