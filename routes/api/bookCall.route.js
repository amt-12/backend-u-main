const express = require('express');
const { createBookCall, getBookings, getAllBookCalls, updateBookCallStatus, deleteBookCall, getBookCallById, updateBookCall } = require('../../controller/BookCallController');

const router = express.Router();

router.post('/book', createBookCall);
router.get('/getBookings', getBookings);
router.get('/', getAllBookCalls);
router.get('/:id', getBookCallById);
router.put('/:id', updateBookCall);
router.delete('/:id', deleteBookCall);
router.patch('/:id/status', updateBookCallStatus);

module.exports = router;

