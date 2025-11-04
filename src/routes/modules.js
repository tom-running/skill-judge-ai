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

module.exports = router;
