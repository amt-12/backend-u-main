const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const { getPayrollSummary } = require('../../controller/Payroll/payrollController');

const router = express.Router();

router.get('/summary', protect, getPayrollSummary);

module.exports = router;

