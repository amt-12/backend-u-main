const College = require('../../models/College');

const getCollege = async (req, res) => {
  try {
    const { id } = req.params;

    const college = await College.findById(id).populate('assignedTo', 'fullName email role');
    if (!college) {
      return res.status(404).json({ success: false, error: 'College not found' });
    } 

    res.json({ success: true, data: { college } });
  } catch (error) {
    console.error('Get college error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = { getCollege };

