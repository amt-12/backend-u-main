const College = require('../../models/College');

const createCollege = async (req, res) => {
  try {
    // Auth check (protect middleware + admin role)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access only' });
    }

    const { name, status, location, contact, poc, tpo, notes, technologies, educationPrograms } = req.body;

    // Basic validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'College name is required' });
    }

    // Check for duplicate name (case-insensitive)
    const existingCollege = await College.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existingCollege) {
      return res.status(400).json({ success: false, error: 'College with this name already exists' });
    }

    const college = new College({
      name: name.trim(),
      status: status || 'active',
      location: location || {},
      contact: contact || {},
      poc: poc || {},
      tpo: tpo || {},
      notes: notes?.trim() || '',
      technologies: technologies || [],
      educationPrograms: educationPrograms || []
    });

    const savedCollege = await college.save();

    res.status(201).json({ 
      success: true,
      message: 'College created successfully',
      data: { college: savedCollege }
    });
  } catch (error) {
    console.error('Create college error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = { createCollege };

