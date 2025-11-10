const db = require('../config/database');
const { hasEventAccess, getEventIdByModuleId } = require('../middleware/permissions');
const { aiRegistry } = require('../services/aiEvaluator');

// AI评分状态管理
const aiEvaluationStatus = {
  // 存储正在进行的评分任务 { moduleId: Set<contestantId>, ... }
  inProgress: new Map(),
  
  // 检查是否正在评分
  isEvaluating(moduleId, contestantId = null) {
    if (!this.inProgress.has(moduleId)) return false;
    if (contestantId === null) return this.inProgress.get(moduleId).size > 0;
    return this.inProgress.get(moduleId).has(contestantId);
  },
  
  // 开始评分
  startEvaluation(moduleId, contestantId = null) {
    if (!this.inProgress.has(moduleId)) {
      this.inProgress.set(moduleId, new Set());
    }
    if (contestantId !== null) {
      this.inProgress.get(moduleId).add(contestantId);
    } else {
      // 模块级别评分，标记所有选手
      this.inProgress.get(moduleId).add('*');
    }
  },
  
  // 结束评分
  endEvaluation(moduleId, contestantId = null) {
    if (!this.inProgress.has(moduleId)) return;
    if (contestantId !== null) {
      this.inProgress.get(moduleId).delete(contestantId);
    } else {
      // 模块级别评分结束
      this.inProgress.get(moduleId).delete('*');
    }
    
    // 如果没有任务了，清理模块
    if (this.inProgress.get(moduleId).size === 0) {
      this.inProgress.delete(moduleId);
    }
  }
};

exports.getAllModules = async (req, res) => {
  try {
    const { event_id } = req.query;
    const { user } = req;

    let query = `
      SELECT m.* FROM modules m
      JOIN events e ON m.event_id = e.id
    `;
    const params = [];

    // 根据用户角色过滤可见的模块
    if (user.role === 'chief_judge') {
      query += ` WHERE e.id IN (
        SELECT event_id FROM event_chief_judges WHERE chief_judge_id = $1
      )`;
      params.push(user.id);
    } else if (user.role === 'judge') {
      query += ` WHERE e.id IN (
        SELECT event_id FROM event_judges WHERE judge_id = $1
      )`;
      params.push(user.id);
    } else if (user.role === 'contestant') {
      query += ` WHERE e.id IN (
        SELECT event_id FROM event_contestants WHERE contestant_id = $1
      ) AND m.status != 'pending'`;  // 选手不能看到未开始的模块
      params.push(user.id);
    }

    if (event_id) {
      const eventCondition = params.length > 0 ? ' AND m.event_id = $' + (params.length + 1) : ' WHERE m.event_id = $1';
      query += eventCondition;
      params.push(event_id);
    }

    query += ' ORDER BY m.created_at';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
};

exports.getModuleById = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const result = await db.query('SELECT * FROM modules WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const module = result.rows[0];

    // 检查权限
    const hasAccess = await hasEventAccess(user.id, module.event_id, user.role);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 获取赛题附件（仅进行中或已结束时可见，或管理员/裁判长可见）
    let problemAttachments = [];
    if (module.status !== 'pending' || ['admin', 'chief_judge'].includes(user.role)) {
      const problemResult = await db.query(
        'SELECT * FROM problem_attachments WHERE module_id = $1',
        [id]
      );
      problemAttachments = problemResult.rows;
    }

    // 获取评分标准（仅管理员和裁判长可见）
    let scoringCriteria = null;
    if (['admin', 'chief_judge'].includes(user.role)) {
      const criteriaResult = await db.query(
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
        [id]
      );
      if (criteriaResult.rows.length > 0) {
        scoringCriteria = criteriaResult.rows[0];
      }
    }

    res.json({
      ...module,
      problem_attachments: problemAttachments,
      scoring_criteria: scoringCriteria
    });
  } catch (error) {
    console.error('Get module error:', error);
    res.status(500).json({ error: 'Failed to fetch module' });
  }
};

exports.createModule = async (req, res) => {
  try {
    const { event_id, name, duration_minutes } = req.body;
    const { user } = req;

    // 检查权限
    const hasAccess = await hasEventAccess(user.id, event_id, user.role);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      `INSERT INTO modules (event_id, name, duration_minutes, status) 
       VALUES ($1, $2, $3, 'pending') 
       RETURNING *`,
      [event_id, name, duration_minutes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create module error:', error);
    res.status(500).json({ error: 'Failed to create module' });
  }
};

exports.updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, duration_minutes } = req.body;

    const result = await db.query(
      `UPDATE modules 
       SET name = $1, duration_minutes = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 
       RETURNING *`,
      [name, duration_minutes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({ error: 'Failed to update module' });
  }
};

exports.deleteModule = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM modules WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }

    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({ error: 'Failed to delete module' });
  }
};

// 更新模块状态
exports.updateModuleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'in_progress', 'finished', 'scoring', 'scoring_finished'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await db.query(
      `UPDATE modules 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const module = result.rows[0];

    // 如果状态变为finished，创建评分记录
    if (status === 'finished') {
      setTimeout(() => createScoringRecords(id), 1000);
    }

    res.json(module);
  } catch (error) {
    console.error('Update module status error:', error);
    res.status(500).json({ error: 'Failed to update module status' });
  }
};

// 创建评分记录（异步）
async function createScoringRecords(moduleId) {
  try {
    console.log(`Creating scoring records for module ${moduleId}`);

    // 获取模块所属的赛项ID
    const moduleResult = await db.query(
      'SELECT event_id FROM modules WHERE id = $1',
      [moduleId]
    );

    if (moduleResult.rows.length === 0) {
      console.log(`Module ${moduleId} not found`);
      return;
    }

    const eventId = moduleResult.rows[0].event_id;

    // 获取该赛项的所有选手
    const contestantsResult = await db.query(
      `SELECT u.id 
       FROM users u
       JOIN event_contestants ec ON u.id = ec.contestant_id
       WHERE ec.event_id = $1`,
      [eventId]
    );

    // 为每个选手创建评分记录（如果不存在）
    for (const contestant of contestantsResult.rows) {
      try {
        await db.query(
          `INSERT INTO scoring_records (module_id, contestant_id)
           VALUES ($1, $2)
           ON CONFLICT (module_id, contestant_id) DO NOTHING`,
          [moduleId, contestant.id]
        );
      } catch (error) {
        console.error(`Error creating scoring record for contestant ${contestant.id}:`, error);
      }
    }

    console.log(`Scoring records created for module ${moduleId}`);
  } catch (error) {
    console.error(`Error creating scoring records for module ${moduleId}:`, error);
  }
}

// 模块级别AI评分接口
exports.triggerModuleAIEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // 检查权限
    const eventId = await getEventIdByModuleId(id);
    const hasAccess = await hasEventAccess(user.id, eventId, user.role);
    if (!hasAccess || !['admin', 'chief_judge'].includes(user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 检查是否正在评分
    if (aiEvaluationStatus.isEvaluating(id)) {
      return res.status(400).json({ error: '该模块正在进行AI评分，请稍后再试' });
    }

    // 开始评分
    aiEvaluationStatus.startEvaluation(id);

    // 异步执行AI评分
    setTimeout(() => triggerAIEvaluationForModule(id), 100);

    res.json({ message: 'AI评分已开始，请稍后查看结果' });
  } catch (error) {
    console.error('Trigger module AI evaluation error:', error);
    aiEvaluationStatus.endEvaluation(req.params.id);
    res.status(500).json({ error: 'Failed to trigger AI evaluation' });
  }
};

// 单个选手AI评分接口
exports.triggerContestantAIEvaluation = async (req, res) => {
  try {
    const { moduleId, contestantId } = req.params;
    const { user } = req;

    // 检查权限
    const eventId = await getEventIdByModuleId(moduleId);
    const hasAccess = await hasEventAccess(user.id, eventId, user.role);
    if (!hasAccess || !['admin', 'chief_judge', 'judge'].includes(user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 检查是否正在评分
    if (aiEvaluationStatus.isEvaluating(moduleId, contestantId)) {
      return res.status(400).json({ error: '该选手正在进行AI评分，请稍后再试' });
    }

    // 开始评分
    aiEvaluationStatus.startEvaluation(moduleId, contestantId);

    // 异步执行AI评分
    setTimeout(() => triggerAIEvaluationForContestant(moduleId, contestantId), 100);

    res.json({ message: 'AI评分已开始，请稍后查看结果' });
  } catch (error) {
    console.error('Trigger contestant AI evaluation error:', error);
    aiEvaluationStatus.endEvaluation(req.params.moduleId, req.params.contestantId);
    res.status(500).json({ error: 'Failed to trigger AI evaluation' });
  }
};

// 触发模块AI评估（异步）
async function triggerAIEvaluationForModule(moduleId) {
  try {
    console.log(`Triggering AI evaluation for module ${moduleId}`);

    // 检查是否有注册的评估器
    if (!aiRegistry.hasEvaluator(moduleId)) {
      console.log(`No AI evaluator registered for module ${moduleId}`);
      aiEvaluationStatus.endEvaluation(moduleId);
      return;
    }

    // 获取评分标准
    const criteriaResult = await db.query(
      `SELECT sc.*, 
       json_agg(
         json_build_object(
           'id', si.id,
           'description', si.description,
           'evaluation_type', si.evaluation_type,
           'max_score', si.max_score
         ) ORDER BY si.sort_order
       ) as items
       FROM scoring_criteria sc
       LEFT JOIN scoring_items si ON sc.id = si.criteria_id
       WHERE sc.module_id = $1
       GROUP BY sc.id`,
      [moduleId]
    );

    if (criteriaResult.rows.length === 0) {
      console.log(`No scoring criteria found for module ${moduleId}`);
      aiEvaluationStatus.endEvaluation(moduleId);
      return;
    }

    const scoringCriteria = criteriaResult.rows[0];

    // 获取赛题附件
    const problemAttachmentsResult = await db.query(
      'SELECT * FROM problem_attachments WHERE module_id = $1',
      [moduleId]
    );

    // 获取所有选手
    const moduleResult = await db.query(
      'SELECT event_id FROM modules WHERE id = $1',
      [moduleId]
    );
    const eventId = moduleResult.rows[0].event_id;

    const contestantsResult = await db.query(
      `SELECT u.id 
       FROM users u
       JOIN event_contestants ec ON u.id = ec.contestant_id
       WHERE ec.event_id = $1`,
      [eventId]
    );

    // 为每个选手进行评估
    for (const contestant of contestantsResult.rows) {
      try {
        await evaluateContestant(moduleId, contestant.id, scoringCriteria, problemAttachmentsResult.rows);
      } catch (error) {
        console.error(`Error evaluating contestant ${contestant.id}:`, error);
      }
    }

    console.log(`AI evaluation completed for module ${moduleId}`);
    aiEvaluationStatus.endEvaluation(moduleId);
  } catch (error) {
    console.error(`AI evaluation error for module ${moduleId}:`, error);
    aiEvaluationStatus.endEvaluation(moduleId);
  }
}

// 触发单个选手AI评估（异步）
async function triggerAIEvaluationForContestant(moduleId, contestantId) {
  try {
    console.log(`Triggering AI evaluation for module ${moduleId}, contestant ${contestantId}`);

    // 检查是否有注册的评估器
    if (!aiRegistry.hasEvaluator(moduleId)) {
      console.log(`No AI evaluator registered for module ${moduleId}`);
      aiEvaluationStatus.endEvaluation(moduleId, contestantId);
      return;
    }

    // 获取评分标准
    const criteriaResult = await db.query(
      `SELECT sc.*, 
       json_agg(
         json_build_object(
           'id', si.id,
           'description', si.description,
           'evaluation_type', si.evaluation_type,
           'max_score', si.max_score
         ) ORDER BY si.sort_order
       ) as items
       FROM scoring_criteria sc
       LEFT JOIN scoring_items si ON sc.id = si.criteria_id
       WHERE sc.module_id = $1
       GROUP BY sc.id`,
      [moduleId]
    );

    if (criteriaResult.rows.length === 0) {
      console.log(`No scoring criteria found for module ${moduleId}`);
      aiEvaluationStatus.endEvaluation(moduleId, contestantId);
      return;
    }

    const scoringCriteria = criteriaResult.rows[0];

    // 获取赛题附件
    const problemAttachmentsResult = await db.query(
      'SELECT * FROM problem_attachments WHERE module_id = $1',
      [moduleId]
    );

    await evaluateContestant(moduleId, contestantId, scoringCriteria, problemAttachmentsResult.rows);

    console.log(`AI evaluation completed for contestant ${contestantId}`);
    aiEvaluationStatus.endEvaluation(moduleId, contestantId);
  } catch (error) {
    console.error(`AI evaluation error for contestant ${contestantId}:`, error);
    aiEvaluationStatus.endEvaluation(moduleId, contestantId);
  }
}

// 评估单个选手的通用函数
async function evaluateContestant(moduleId, contestantId, scoringCriteria, problemAttachments) {
  // 获取选手答题附件
  const answerAttachmentsResult = await db.query(
    'SELECT * FROM answer_attachments WHERE module_id = $1 AND contestant_id = $2',
    [moduleId, contestantId]
  );

  if (answerAttachmentsResult.rows.length === 0) {
    console.log(`No answer attachments for contestant ${contestantId}`);
    return;
  }

  // 调用AI评估
  const evaluationResults = await aiRegistry.evaluate(
    moduleId,
    scoringCriteria,
    problemAttachments,
    answerAttachmentsResult.rows
  );

  // 保存评估结果
  if (evaluationResults) {
    // 确保有评分记录
    const recordResult = await db.query(
      `INSERT INTO scoring_records (module_id, contestant_id)
       VALUES ($1, $2)
       ON CONFLICT (module_id, contestant_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [moduleId, contestantId]
    );

    const recordId = recordResult.rows[0].id;

    // 保存每个评分项的结果
    for (const result of evaluationResults) {
      await db.query(
        `INSERT INTO scoring_item_results 
         (scoring_record_id, scoring_item_id, ai_score, ai_suggestion)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (scoring_record_id, scoring_item_id) 
         DO UPDATE SET ai_score = $3, ai_suggestion = $4, updated_at = CURRENT_TIMESTAMP`,
        [recordId, result.scoring_item_id, result.ai_score, result.ai_suggestion]
      );
    }

    //console.log(`AI evaluation completed for contestant ${contestantId}`);
  }
}
