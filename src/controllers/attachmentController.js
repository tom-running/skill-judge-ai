const path = require('path');
const fs = require('fs').promises;
const db = require('../config/database');
const { hasEventAccess, getEventIdByModuleId } = require('../middleware/permissions');

// 上传赛题附件
exports.uploadProblemAttachment = async (req, res) => {
  try {
    const { module_id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const eventId = await getEventIdByModuleId(module_id);
    if (!eventId) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // 检查权限（仅管理员和裁判长可上传赛题）
    const hasAccess = await hasEventAccess(req.user.id, eventId, req.user.role);
    if (!hasAccess || !['admin', 'chief_judge'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      `INSERT INTO problem_attachments (module_id, filename, filepath) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [module_id, req.file.originalname, req.file.path]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Upload problem attachment error:', error);
    res.status(500).json({ error: 'Failed to upload problem attachment' });
  }
};

// 获取赛题附件列表
exports.getProblemAttachments = async (req, res) => {
  try {
    const { module_id } = req.params;
    const { user } = req;

    const moduleResult = await db.query(
      'SELECT event_id, status FROM modules WHERE id = $1',
      [module_id]
    );

    if (moduleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const module = moduleResult.rows[0];

    // 检查权限
    const hasAccess = await hasEventAccess(user.id, module.event_id, user.role);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 只有进行中或已结束时可见，或管理员/裁判长可见
    if (module.status === 'pending' && !['admin', 'chief_judge'].includes(user.role)) {
      return res.status(403).json({ error: 'Problem attachments not available yet' });
    }

    const result = await db.query(
      'SELECT * FROM problem_attachments WHERE module_id = $1',
      [module_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get problem attachments error:', error);
    res.status(500).json({ error: 'Failed to fetch problem attachments' });
  }
};

// 删除赛题附件
exports.deleteProblemAttachment = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM problem_attachments WHERE id = $1 RETURNING filepath',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // 删除文件
    try {
      await fs.unlink(result.rows[0].filepath);
    } catch (err) {
      console.error('Error deleting file:', err);
    }

    res.json({ message: 'Problem attachment deleted successfully' });
  } catch (error) {
    console.error('Delete problem attachment error:', error);
    res.status(500).json({ error: 'Failed to delete problem attachment' });
  }
};

// 上传答题附件
exports.uploadAnswerAttachment = async (req, res) => {
  try {
    const { module_id } = req.params;
    const { user } = req;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const moduleResult = await db.query(
      'SELECT event_id, status FROM modules WHERE id = $1',
      [module_id]
    );

    if (moduleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const module = moduleResult.rows[0];

    // 检查权限
    const hasAccess = await hasEventAccess(user.id, module.event_id, user.role);
    if (!hasAccess || user.role !== 'contestant') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 只有进行中时可提交
    if (module.status !== 'in_progress') {
      return res.status(403).json({ error: 'Module is not in progress' });
    }

    const result = await db.query(
      `INSERT INTO answer_attachments (module_id, contestant_id, filename, filepath) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [module_id, user.id, req.file.originalname, req.file.path]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Upload answer attachment error:', error);
    res.status(500).json({ error: 'Failed to upload answer attachment' });
  }
};

// 获取答题附件列表
exports.getAnswerAttachments = async (req, res) => {
  try {
    const { module_id, contestant_id } = req.params;
    const { user } = req;

    const moduleResult = await db.query(
      'SELECT event_id FROM modules WHERE id = $1',
      [module_id]
    );

    if (moduleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const eventId = moduleResult.rows[0].event_id;

    // 检查权限
    const hasAccess = await hasEventAccess(user.id, eventId, user.role);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 选手只能看自己的
    if (user.role === 'contestant' && user.id !== parseInt(contestant_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 裁判只能看分配给自己的选手
    if (user.role === 'judge') {
      const hasContestantAccess = await db.query(
        'SELECT 1 FROM judge_contestant_assignments WHERE event_id = $1 AND judge_id = $2 AND contestant_id = $3',
        [eventId, user.id, contestant_id]
      );
      if (hasContestantAccess.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await db.query(
      'SELECT * FROM answer_attachments WHERE module_id = $1 AND contestant_id = $2',
      [module_id, contestant_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get answer attachments error:', error);
    res.status(500).json({ error: 'Failed to fetch answer attachments' });
  }
};

// 删除答题附件
exports.deleteAnswerAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const result = await db.query(
      'SELECT * FROM answer_attachments WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const attachment = result.rows[0];

    // 只有上传者本人可以删除
    if (attachment.contestant_id !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.query('DELETE FROM answer_attachments WHERE id = $1', [id]);

    // 删除文件
    try {
      await fs.unlink(attachment.filepath);
    } catch (err) {
      console.error('Error deleting file:', err);
    }

    res.json({ message: 'Answer attachment deleted successfully' });
  } catch (error) {
    console.error('Delete answer attachment error:', error);
    res.status(500).json({ error: 'Failed to delete answer attachment' });
  }
};

// 下载附件
exports.downloadAttachment = async (req, res) => {
  try {
    const { filepath } = req.query;

    if (!filepath || !filepath.startsWith(path.join(__dirname, '../../uploads'))) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    res.download(filepath);
  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({ error: 'Failed to download attachment' });
  }
};
