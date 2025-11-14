const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, eventController.getAllEvents);
router.get('/:id', auth, eventController.getEventById);
router.post('/', auth, requireRole('admin', 'chief_judge'), eventController.createEvent);
router.put('/:id', auth, requireRole('admin', 'chief_judge'), eventController.updateEvent);
router.delete('/:id', auth, requireRole('admin', 'chief_judge'), eventController.deleteEvent);

// 分配裁判长、裁判、选手
router.post('/:id/chief-judges', auth, requireRole('admin'), eventController.assignChiefJudge);
router.delete('/:id/chief-judges/:chief_judge_id', auth, requireRole('admin'), eventController.removeChiefJudge);

router.post('/:id/judges', auth, requireRole('admin', 'chief_judge'), eventController.assignJudge);
router.delete('/:id/judges/:judge_id', auth, requireRole('admin', 'chief_judge'), eventController.removeJudge);

router.post('/:id/contestants', auth, requireRole('admin', 'chief_judge'), eventController.assignContestant);
router.delete('/:id/contestants/:contestant_id', auth, requireRole('admin', 'chief_judge'), eventController.removeContestant);

router.post('/:id/judge-contestants', auth, requireRole('admin', 'chief_judge'), eventController.assignJudgeContestant);
router.get('/:id/judge-contestants', auth, eventController.getJudgeContestantAssignments);
router.delete('/:id/judge-contestants', auth, requireRole('admin', 'chief_judge'), eventController.removeJudgeContestant);

module.exports = router;
