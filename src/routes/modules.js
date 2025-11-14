const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/moduleController');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, moduleController.getAllModules);
router.get('/:id', auth, moduleController.getModuleById);
router.post('/', auth, requireRole('admin', 'chief_judge'), moduleController.createModule);
router.put('/:id', auth, requireRole('admin', 'chief_judge'), moduleController.updateModule);
router.delete('/:id', auth, requireRole('admin', 'chief_judge'), moduleController.deleteModule);

router.patch('/:id/status', auth, requireRole('admin', 'chief_judge'), moduleController.updateModuleStatus);

// AI评分相关路由
router.post('/:id/ai-evaluation', auth, requireRole('admin', 'chief_judge'), moduleController.triggerModuleAIEvaluation);
router.post('/:moduleId/contestants/:contestantId/ai-evaluation', auth, requireRole('admin', 'chief_judge', 'judge'), moduleController.triggerContestantAIEvaluation);

module.exports = router;
