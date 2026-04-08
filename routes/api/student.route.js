const express = require('express');
const router = express.Router();
const { getResultsByCollege } = require('../../controller/Student/GetStudentResultsController');
const { 
  getAllStudents, 
  getRegistrations, 
  getStudentsByCollege, 
  getStudentByEmail, 
  registerStudent, 
  updateStudentByEmail, 
  deleteStudentByEmail,
  sendTestInvite
} = require('../../controller/Student/StudentManagementController');
const { protect } = require('../../middleware/authMiddleware');

// Test results
router.get('/results-by-college', protect, getResultsByCollege);

// Student management
router.get('/all', protect, getAllStudents);
router.get('/registrations', protect, getRegistrations);
router.get('/by-college', protect, getStudentsByCollege);
router.get('/by-email', protect, getStudentByEmail);
router.post('/register', registerStudent); // Public or protected depending on use case
router.put('/by-email', protect, updateStudentByEmail);
router.delete('/by-email', protect, deleteStudentByEmail);

// Actions
router.post('/send-test-invite', protect, sendTestInvite);

module.exports = router;
