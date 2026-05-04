const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const { getBatches, createBatch } = require('../../controller/Batch/batchesController');

const router = express.Router();

router.use(protect);

router.get('/', getBatches);
router.post('/', createBatch);

module.exports = router;

