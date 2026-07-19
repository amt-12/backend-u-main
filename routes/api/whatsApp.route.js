const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const { getStatus, getGroups, sendMessage, resolveInviteLink, sendCalendarExcel } = require('../../controller/WhatsApp/whatsAppController');

const router = express.Router();

router.use(protect);

router.get('/status', getStatus);
router.get('/groups', getGroups);
router.post('/send-calendar', sendMessage);
router.post('/resolve-invite', resolveInviteLink);
router.post('/send-calendar-excel', sendCalendarExcel);

module.exports = router;
