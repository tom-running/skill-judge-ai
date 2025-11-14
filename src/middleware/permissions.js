const db = require('../config/database');

// 检查用户是否有权限访问某个赛项
async function hasEventAccess(userId, eventId, role) {
  if (role === 'admin') {
    return true;
  }

  if (role === 'chief_judge') {
    const result = await db.query(
      'SELECT 1 FROM event_chief_judges WHERE event_id = $1 AND chief_judge_id = $2',
      [eventId, userId]
    );
    return result.rows.length > 0;
  }

  if (role === 'judge') {
    const result = await db.query(
      'SELECT 1 FROM event_judges WHERE event_id = $1 AND judge_id = $2',
      [eventId, userId]
    );
    return result.rows.length > 0;
  }

  if (role === 'contestant') {
    const result = await db.query(
      'SELECT 1 FROM event_contestants WHERE event_id = $1 AND contestant_id = $2',
      [eventId, userId]
    );
    return result.rows.length > 0;
  }

  return false;
}

// 检查裁判是否有权限访问某个选手
async function hasContestantAccess(judgeId, contestantId, eventId) {
  const result = await db.query(
    'SELECT 1 FROM judge_contestant_assignments WHERE event_id = $1 AND judge_id = $2 AND contestant_id = $3',
    [eventId, judgeId, contestantId]
  );
  return result.rows.length > 0;
}

// 通过模块ID获取赛项ID
async function getEventIdByModuleId(moduleId) {
  const result = await db.query(
    'SELECT event_id FROM modules WHERE id = $1',
    [moduleId]
  );
  return result.rows.length > 0 ? result.rows[0].event_id : null;
}

module.exports = {
  hasEventAccess,
  hasContestantAccess,
  getEventIdByModuleId,
};
