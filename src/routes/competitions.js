const express = require('express');
const router = express.Router();
const competitionController = require('../controllers/competitionController');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, competitionController.getAllCompetitions);
router.get('/:id', auth, competitionController.getCompetitionById);
router.post('/', auth, requireRole('admin'), competitionController.createCompetition);
router.put('/:id', auth, requireRole('admin'), competitionController.updateCompetition);
router.delete('/:id', auth, requireRole('admin'), competitionController.deleteCompetition);

module.exports = router;
