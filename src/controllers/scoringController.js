const db = require('../config/database');
const { hasEventAccess, getEventIdByModuleId } = require('../middleware/permissions');

// 创建或获取评分标准
exports.getScoringCriteria = async (req, res) => {
  try {
    const { module_id } = req.params;
    const { user } = req;

    const eventId = await getEventIdByModuleId(module_id);
    if (!eventId) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // 检查权限（仅管理员和裁判长可见）
    const hasAccess = await hasEventAccess(user.id, eventId, user.role);
    if (!hasAccess || !['admin', 'chief_judge'].includes(user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      `SELECT sc.*, 
       json_agg(
         json_build_object(
           'id', si.id,
           'description', si.description,
           'evaluation_type', si.evaluation_type,
           'max_score', si.max_score,
           'sort_order', si.sort_order
         ) ORDER BY si.sort_order
       ) as items
       FROM scoring_criteria sc
       LEFT JOIN scoring_items si ON sc.id = si.criteria_id
       WHERE sc.module_id = $1
       GROUP BY sc.id`,
      [module_id]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get scoring criteria error:', error);
    res.status(500).json({ error: 'Failed to fetch scoring criteria' });
  }
};

// 创建评分标准
exports.createScoringCriteria = async (req, res) => {
  try {
    const { module_id } = req.params;

    const result = await db.query(
      `INSERT INTO scoring_criteria (module_id) 
       VALUES ($1) 
       RETURNING *`,
      [module_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create scoring criteria error:', error);
    res.status(500).json({ error: 'Failed to create scoring criteria' });
  }
};

// 添加评分项
exports.addScoringItem = async (req, res) => {
  try {
    const { criteria_id } = req.params;
    const { description, evaluation_type, max_score, sort_order } = req.body;

    if (!['subjective', 'objective'].includes(evaluation_type)) {
      return res.status(400).json({ error: 'Invalid evaluation type' });
    }

    const result = await db.query(
      `INSERT INTO scoring_items (criteria_id, description, evaluation_type, max_score, sort_order) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [criteria_id, description, evaluation_type, max_score, sort_order || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add scoring item error:', error);
    res.status(500).json({ error: 'Failed to add scoring item' });
  }
};

// 更新评分项
exports.updateScoringItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, evaluation_type, max_score, sort_order } = req.body;

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      params.push(description);
    }

    if (evaluation_type !== undefined) {
      if (!['subjective', 'objective'].includes(evaluation_type)) {
        return res.status(400).json({ error: 'Invalid evaluation type' });
      }
      updates.push(`evaluation_type = $${paramCount++}`);
      params.push(evaluation_type);
    }

    if (max_score !== undefined) {
      updates.push(`max_score = $${paramCount++}`);
      params.push(max_score);
    }

    if (sort_order !== undefined) {
      updates.push(`sort_order = $${paramCount++}`);
      params.push(sort_order);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await db.query(
      `UPDATE scoring_items SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scoring item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update scoring item error:', error);
    res.status(500).json({ error: 'Failed to update scoring item' });
  }
};

// 删除评分项
exports.deleteScoringItem = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM scoring_items WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scoring item not found' });
    }

    res.json({ message: 'Scoring item deleted successfully' });
  } catch (error) {
    console.error('Delete scoring item error:', error);
    res.status(500).json({ error: 'Failed to delete scoring item' });
  }
};

// 获取评分记录
exports.getScoringRecords = async (req, res) => {
  try {
    const { module_id } = req.params;
    const { user } = req;

    const eventId = await getEventIdByModuleId(module_id);
    if (!eventId) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // 检查权限
    const hasAccess = await hasEventAccess(user.id, eventId, user.role);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 查询所有参与该赛项的选手，并左连接评分记录
    let query = `
      SELECT 
        COALESCE(sr.id, 0) as id,
        u.id as contestant_id,
        u.username, 
        u.name as contestant_name,
        COALESCE(
          json_agg(
            CASE WHEN sir.id IS NOT NULL THEN
              json_build_object(
                'id', sir.id,
                'scoring_item_id', sir.scoring_item_id,
                'judge_score', sir.judge_score,
                'ai_score', sir.ai_score,
                'ai_suggestion', sir.ai_suggestion,
                'description', si.description,
                'evaluation_type', si.evaluation_type,
                'max_score', si.max_score
              )
            ELSE
              json_build_object(
                'id', null,
                'scoring_item_id', si.id,
                'judge_score', null,
                'ai_score', null,
                'ai_suggestion', null,
                'description', si.description,
                'evaluation_type', si.evaluation_type,
                'max_score', si.max_score
              )
            END ORDER BY COALESCE(si.sort_order, 0)
          ) FILTER (WHERE si.id IS NOT NULL),
          '[]'::json
        ) as item_results
      FROM users u
      JOIN event_contestants ec ON u.id = ec.contestant_id
      LEFT JOIN scoring_records sr ON sr.module_id = $1 AND sr.contestant_id = u.id
      LEFT JOIN scoring_item_results sir ON sr.id = sir.scoring_record_id
      LEFT JOIN scoring_items si ON sir.scoring_item_id = si.id OR (sir.scoring_item_id IS NULL AND si.criteria_id IN (
        SELECT id FROM scoring_criteria WHERE module_id = $1
      ))
      WHERE ec.event_id = $2
    `;
    const params = [module_id, eventId];

    // 裁判只能看到分配给自己的选手
    if (user.role === 'judge') {
      query += ` AND u.id IN (
        SELECT contestant_id FROM judge_contestant_assignments 
        WHERE event_id = $2 AND judge_id = $3
      )`;
      params.push(user.id);
    }

    query += ' GROUP BY u.id, u.username, u.name, sr.id ORDER BY u.name';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get scoring records error:', error);
    res.status(500).json({ error: 'Failed to fetch scoring records' });
  }
};

// 获取单个选手的评分记录
exports.getScoringRecord = async (req, res) => {
  try {
    const { module_id, contestant_id } = req.params;
    const { user } = req;

    const eventId = await getEventIdByModuleId(module_id);
    if (!eventId) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // 检查权限
    const hasAccess = await hasEventAccess(user.id, eventId, user.role);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 裁判只能看到分配给自己的选手
    if (user.role === 'judge') {
      const assignmentResult = await db.query(
        'SELECT 1 FROM judge_contestant_assignments WHERE event_id = $1 AND judge_id = $2 AND contestant_id = $3',
        [eventId, user.id, contestant_id]
      );
      if (assignmentResult.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await db.query(
      `SELECT sr.*, u.username, u.name as contestant_name,
       json_agg(
         json_build_object(
           'id', sir.id,
           'scoring_item_id', sir.scoring_item_id,
           'judge_score', sir.judge_score,
           'ai_score', sir.ai_score,
           'ai_suggestion', sir.ai_suggestion,
           'description', si.description,
           'evaluation_type', si.evaluation_type,
           'max_score', si.max_score
         ) ORDER BY si.sort_order
       ) as item_results
       FROM scoring_records sr
       JOIN users u ON sr.contestant_id = u.id
       LEFT JOIN scoring_item_results sir ON sr.id = sir.scoring_record_id
       LEFT JOIN scoring_items si ON sir.scoring_item_id = si.id
       WHERE sr.module_id = $1 AND sr.contestant_id = $2
       GROUP BY sr.id, u.username, u.name`,
      [module_id, contestant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scoring record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get scoring record error:', error);
    res.status(500).json({ error: 'Failed to fetch scoring record' });
  }
};

// 更新裁判评分
exports.updateJudgeScore = async (req, res) => {
  try {
    const { module_id, contestant_id } = req.params;
    const { scoring_item_id, judge_score } = req.body;
    const { user } = req;

    // 检查模块状态
    const moduleResult = await db.query(
      'SELECT event_id, status FROM modules WHERE id = $1',
      [module_id]
    );

    if (moduleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const { event_id: eventId, status: moduleStatus } = moduleResult.rows[0];

    // 检查是否允许评分
    if (moduleStatus === 'scoring_finished') {
      return res.status(403).json({ error: 'Scoring has been finished and cannot be modified' });
    }

    if (moduleStatus !== 'scoring') {
      return res.status(403).json({ error: 'Module is not in scoring status' });
    }

    // 检查权限（仅裁判和管理员可打分）
    const hasAccess = await hasEventAccess(user.id, eventId, user.role);
    if (!hasAccess || !['admin', 'judge'].includes(user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 裁判只能给分配给自己的选手打分
    if (user.role === 'judge') {
      const assignmentResult = await db.query(
        'SELECT 1 FROM judge_contestant_assignments WHERE event_id = $1 AND judge_id = $2 AND contestant_id = $3',
        [eventId, user.id, contestant_id]
      );
      if (assignmentResult.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // 确保有评分记录
    const recordResult = await db.query(
      `INSERT INTO scoring_records (module_id, contestant_id)
       VALUES ($1, $2)
       ON CONFLICT (module_id, contestant_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [module_id, contestant_id]
    );

    const recordId = recordResult.rows[0].id;

    // 更新评分项结果
    const result = await db.query(
      `INSERT INTO scoring_item_results (scoring_record_id, scoring_item_id, judge_score)
       VALUES ($1, $2, $3)
       ON CONFLICT (scoring_record_id, scoring_item_id)
       DO UPDATE SET judge_score = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [recordId, scoring_item_id, judge_score]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update judge score error:', error);
    res.status(500).json({ error: 'Failed to update judge score' });
  }
};
