const College = require('../../models/College');

const deleteCollege = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access only' });
    }

    const { id } = req.params;

    const college = await College.findById(id);
    if (!college) {
      return res.status(404).json({ success: false, error: 'College not found' });
    }

    await College.findByIdAndDelete(id);

    res.json({ 
      success: true, 
      message: 'College deleted successfully' 
    });
  } catch (error) {
    console.error('Delete college error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = { deleteCollege };

