const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const {
  getWorkflowByBrandLead,
  updateWorkflow,
  advanceMilestone,
  assignProductionTasks,
  requestScriptRevision,
  assignShootTasks,
  assignEditingTask,
  updateEditingStatus,
  getAllWorkflows,
  getClientReviewWorkflow,
  submitClientReview,
  verifyClientAccess
} = require('../../controller/BrandWorkflow/brandWorkflowController');

const router = express.Router();

// Public routes for clients (no authentication required)
router.post('/client-review/verify', verifyClientAccess);
router.get('/client-review/:brandLeadId', getClientReviewWorkflow);
router.post('/client-review/:brandLeadId/review', submitClientReview);

router.use(protect);

router.get('/', getAllWorkflows);
router.get('/:brandLeadId', getWorkflowByBrandLead);
router.put('/:brandLeadId', updateWorkflow);
router.post('/:brandLeadId/advance', advanceMilestone);
router.post('/:brandLeadId/assign-production-tasks', assignProductionTasks);
router.post('/:brandLeadId/script-revision', requestScriptRevision);
router.post('/:brandLeadId/assign-shoot-tasks', assignShootTasks);
router.post('/:brandLeadId/assign-editing-task', assignEditingTask);
router.post('/:brandLeadId/editing-status', updateEditingStatus);

module.exports = router;
