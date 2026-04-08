const express = require('express');
const router = express.Router();
const { applyForInternship } = require('../../controller/Internship/InternshipController');

// POST /api/internship/apply
router.post('/apply', applyForInternship);

module.exports = router;
