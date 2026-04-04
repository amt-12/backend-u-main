const College = require('../../models/College');

const getInviteCollege = async (req, res) => {
  try {
    const { token } = req.params;

    const college = await College.findOne({ 
      inviteToken: token,
      inviteTokenExpiry: { $gt: new Date() } // Not expired
    });

    if (!college) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invalid or expired invite link' 
      });
    }

    // Transform data to match frontend expectations
    const collegeData = {
      collegeId: college._id,
      name: college.name,
      location: college.location,
      contact: college.contact,
      poc: college.poc,
      tpo: college.tpo || {},
      selectedTechnologies: college.technologies ? college.technologies.map(t => ({ name: t.name })) : [],
      selectedEducationPrograms: college.educationPrograms ? college.educationPrograms.map(e => ({ name: e.name })) : [],
      placementDriveDate: college.placementDriveDate, // Frontend expects this field, add to model if needed
      inviteStatus: college.inviteStatus
    };

    res.json({
      success: true,
      data: collegeData
    });

  } catch (error) {
    console.error('Get invite college error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = { getInviteCollege };

