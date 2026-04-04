const College = require('../../models/College');

const updateCollege = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access only' });
    }

    const { id } = req.params;
    const updates = req.body;

    // Validate name if provided
    if (updates.name) {
      updates.name = updates.name.trim();
      if (updates.name.length === 0) {
        return res.status(400).json({ success: false, error: 'College name is required' });
      }
    }

    // Remove undefined fields
    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined || updates[key] === null) {
        delete updates[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No updates provided' });
    }

    const college = await College.findById(id);
    if (!college) {
      return res.status(404).json({ success: false, error: 'College not found' });
    }

    // Prevent duplicate name
    if (updates.name && updates.name.toLowerCase() !== college.name.toLowerCase()) {
      const existing = await College.findOne({ 
        name: { $regex: new RegExp(`^${updates.name}$`, 'i') },
        _id: { $ne: id }
      });
      if (existing) {
        return res.status(400).json({ success: false, error: 'College with this name already exists' });
      }
    }

    const updatedCollege = await College.findByIdAndUpdate(
      id, 
      updates, 
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'College updated successfully',
      data: { college: updatedCollege }
    });
  } catch (error) {
    console.error('Update college error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = { updateCollege };

