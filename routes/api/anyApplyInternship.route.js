const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');

const {
  anyApplyInternship,
  listInternshipApplications,
  getInternshipApplicationById,
  updateInternshipApplication,
  deleteInternshipApplication,
} = require('../../controller/Internship/anyApplyInternshipController');

// Public: submit internship application (new handler)
router.post('/any-apply', anyApplyInternship);

// Admin CRUD (requires auth)
router.get('/', protect, listInternshipApplications);
router.get('/:id', protect, getInternshipApplicationById);
router.put('/:id', protect, updateInternshipApplication);
router.delete('/:id', protect, deleteInternshipApplication);

module.exports = router;

