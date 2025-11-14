const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const attachmentController = require('../controllers/attachmentController');
const { auth } = require('../middleware/auth');

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// 赛题附件
router.post('/modules/:module_id/problem', auth, upload.single('file'), attachmentController.uploadProblemAttachment);
router.get('/modules/:module_id/problem', auth, attachmentController.getProblemAttachments);
router.delete('/problem/:id', auth, attachmentController.deleteProblemAttachment);

// 答题附件
router.post('/modules/:module_id/answer', auth, upload.single('file'), attachmentController.uploadAnswerAttachment);
router.get('/modules/:module_id/contestants/:contestant_id/answer', auth, attachmentController.getAnswerAttachments);
router.delete('/answer/:id', auth, attachmentController.deleteAnswerAttachment);

// 下载
router.get('/download', auth, attachmentController.downloadAttachment);

module.exports = router;
