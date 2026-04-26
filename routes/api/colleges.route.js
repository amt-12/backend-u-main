const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const { getColleges } = require('../../controller/College/getCollegesController');
const { getCollege } = require('../../controller/College/getCollegeController');
const { createCollege } = require('../../controller/College/createCollegeController');
const { updateCollege } = require('../../controller/College/updateCollegeController');
const { deleteCollege } = require('../../controller/College/deleteCollegeController');
const { sendInvite } = require('../../controller/College/sendInviteController');
const { getInviteCollege } = require('../../controller/College/getInviteCollegeController');
const { submitInviteDate } = require('../../controller/College/submitInviteDateController');
const { sendWorkshopEmail } = require('../../controller/College/sendWorkshopEmailController');
const { sendGuestLectureEmail } = require('../../controller/College/sendGuestLectureEmailController');
const { sendPlacementDriveEmail } = require('../../controller/College/sendPlacementDriveEmailController');

const router = express.Router();

// Public routes (no auth needed)
router.get('/', getColleges);
router.get('/invite/:token', getInviteCollege);
router.post('/invite/submit-date/:token', submitInviteDate);
router.get('/:id', getCollege);

// Protected routes
router.use(protect);

router.post('/', createCollege);
router.put('/:id', updateCollege);
router.delete('/:id', deleteCollege);
router.post('/:id/invite', sendInvite);
router.post('/:id/send-workshop', sendWorkshopEmail);
router.post('/:id/send-guest-lecture', sendGuestLectureEmail);
router.post('/:id/send-placement-drive', sendPlacementDriveEmail);

module.exports = router;

