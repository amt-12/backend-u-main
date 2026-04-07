const College = require('../../models/College');

const submitInviteDate = async (req, res) => {
  try {
    const { token } = req.params;
    const { placementDriveDate, placementDriveEndDate, inviteType, poc, tpo } = req.body;

    if (!placementDriveDate) {
      return res.status(400).json({ success: false, error: 'Placement drive date is required' });
    }

    const college = await College.findOne({ 
      inviteToken: token,
      inviteTokenExpiry: { $gt: new Date() }
    });

    if (!college) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invalid or expired invite link' 
      });
    }

    // Update college with date selection and POC/TPO
    college.placementDriveDate = new Date(placementDriveDate);
    if (placementDriveEndDate) {
      college.placementDriveEndDate = new Date(placementDriveEndDate);
    }
    college.dateSubmittedAt = new Date();
    college.inviteStatus = 'details_submitted';
    
    if (poc) {
      college.poc = { ...(college.poc || {}), ...poc };
    }
    if (tpo) {
      college.tpo = { ...(college.tpo || {}), ...tpo };
    }

    await college.save();

    res.json({
      success: true,
      message: 'Preferred date submitted successfully',
      data: { collegeId: college._id }
    });

  } catch (error) {
    console.error('Submit invite date error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = { submitInviteDate };

