const College = require('../../models/College');

const getInviteCollege = async (req, res) => {
  try {
    const { token } = req.params;
    console.log('[getInviteCollege] Received token:', token);
    console.log('[getInviteCollege] Current server time:', new Date());

    // Debug: check if any college has this token at all (ignoring expiry)
    const collegeAny = await College.findOne({ inviteToken: token });
    console.log('[getInviteCollege] Found college with token (any expiry):', collegeAny ? `Yes - ${collegeAny.name}` : 'No');
    if (collegeAny) {
      console.log('[getInviteCollege] Token expiry stored:', collegeAny.inviteTokenExpiry);
      console.log('[getInviteCollege] Is expired:', collegeAny.inviteTokenExpiry ? collegeAny.inviteTokenExpiry < new Date() : 'no expiry');
    }

    const college = await College.findOne({ 
      inviteToken: token,
      inviteTokenExpiry: { $gt: new Date() } // Not expired
    });

    console.log('[getInviteCollege] Query result (not expired):', college ? `Found college: ${college.name}` : 'No college found');
    if (college) {
      console.log('[getInviteCollege] Stored expiry:', college.inviteTokenExpiry);
    }

    if (!college) {
      console.log('[getInviteCollege] Returning 404 - Invalid or expired invite link');
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
