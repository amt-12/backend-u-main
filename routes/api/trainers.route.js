const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const {
  getTrainers,
  getTrainerById,
  createTrainer,
  updateTrainer,
  deleteTrainer
} = require('../../controller/Trainer/trainersController');

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/', getTrainers);
router.get('/:id', getTrainerById);
router.post('/', createTrainer);
router.put('/:id', updateTrainer);
router.delete('/:id', deleteTrainer);

module.exports = router;

