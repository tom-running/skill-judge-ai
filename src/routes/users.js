const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, requireRole('admin'), userController.getAllUsers);
router.post('/', auth, requireRole('admin'), userController.createUser);
router.put('/:id', auth, requireRole('admin'), userController.updateUser);
router.delete('/:id', auth, requireRole('admin'), userController.deleteUser);

module.exports = router;
