const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const {
  createBookCall,
  getBookings,
  getAllBookCalls,
  updateBookCallStatus,
  deleteBookCall,
  getBookCallById,
  updateBookCall,
  addFollowUp,
  moveToOnboarded
} = require('../../controller/BookCallController');

const router = express.Router();

// Public route for clients booking calls
router.post('/book', createBookCall);

// Protected staff/admin routes
router.use(protect);
router.get('/getBookings', getBookings);
router.get('/', getAllBookCalls);
router.post('/move-to-onboarded', moveToOnboarded);
router.get('/:id', getBookCallById);
router.put('/:id', updateBookCall);
router.delete('/:id', deleteBookCall);
router.patch('/:id/status', updateBookCallStatus);
router.post('/:id/follow-up', addFollowUp);

module.exports = router;

