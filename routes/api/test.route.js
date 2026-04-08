const express = require('express');
const multer = require('multer');
const { testS3Connection, uploadToS3 } = require('../../services/s3Service');

// Controllers
const startTest = require('../../controller/Test/startTest');
const fetchQuestion = require('../../controller/Test/fetchQuestion');
const submitAnswer = require('../../controller/Test/submitAnswer');
const submitTest = require('../../controller/Test/submitTest');
const addQuestion = require('../../controller/Test/addQuestion');
const getTestResults = require('../../controller/Test/getTestResults');

// Middleware
const checkTestExpiry = require('../../middleware/checkTestExpiry');

const router = express.Router();

// --- S3 Test Routes ---
router.get('/test-s3', async (req, res) => {
  try {
    const result = await testS3Connection();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const upload = multer({ storage: multer.memoryStorage() });

router.post('/test-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const s3Key = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.json({ success: true, s3Key, message: 'S3 upload test successful!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Test API Routes ---

// POST /api/test/start - Initialize a test session
router.post("/start", startTest);

// POST /api/test/add-question - Add a question (Admin only in production)
router.post("/add-question", addQuestion);

// GET /api/test/question - Fetch a specific question
router.get("/question", fetchQuestion);

// POST /api/test/answer - Submit an answer for a question
router.post("/answer", submitAnswer);

// GET /api/test/results - Get test results (Admin panel)
router.get("/results", getTestResults);

// Routes below require an active test session
router.use(checkTestExpiry);

// POST /api/test/submit - Final test submission
router.post("/submit", submitTest);

module.exports = router;
