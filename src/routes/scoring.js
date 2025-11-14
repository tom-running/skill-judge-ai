const express = require('express');
const router = express.Router();
const scoringController = require('../controllers/scoringController');
const { auth, requireRole } = require('../middleware/auth');

// 评分标准
router.get('/modules/:module_id/criteria', auth, scoringController.getScoringCriteria);
router.post('/modules/:module_id/criteria', auth, requireRole('admin', 'chief_judge'), scoringController.createScoringCriteria);

// 评分项
router.post('/criteria/:criteria_id/items', auth, requireRole('admin', 'chief_judge'), scoringController.addScoringItem);
router.put('/items/:id', auth, requireRole('admin', 'chief_judge'), scoringController.updateScoringItem);
router.delete('/items/:id', auth, requireRole('admin', 'chief_judge'), scoringController.deleteScoringItem);

// 评分记录
router.get('/modules/:module_id/records', auth, scoringController.getScoringRecords);
router.get('/modules/:module_id/contestants/:contestant_id/record', auth, scoringController.getScoringRecord);
router.put('/modules/:module_id/contestants/:contestant_id/score', auth, scoringController.updateJudgeScore);

module.exports = router;
