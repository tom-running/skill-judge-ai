const db = require('../config/database');
const { hasEventAccess } = require('../middleware/permissions');

exports.getAllEvents = async (req, res) => {
  try {
    const { user } = req;
    let query = `
      SELECT e.*, c.name as competition_name 
      FROM events e
      LEFT JOIN competitions c ON e.competition_id = c.id
    `;
    const params = [];

    // 根据用户角色过滤
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
      )`;
      params.push(user.id);
    }

    query += ' ORDER BY e.start_time DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // 检查权限
    const hasAccess = await hasEventAccess(user.id, id, user.role);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      `SELECT e.*, c.name as competition_name 
       FROM events e
       LEFT JOIN competitions c ON e.competition_id = c.id
       WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = result.rows[0];

    // 获取裁判长
    const chiefJudges = await db.query(
      `SELECT u.id, u.username, u.name 
       FROM users u
       JOIN event_chief_judges ecj ON u.id = ecj.chief_judge_id
       WHERE ecj.event_id = $1`,
      [id]
    );

    // 获取裁判
    const judges = await db.query(
      `SELECT u.id, u.username, u.name 
       FROM users u
       JOIN event_judges ej ON u.id = ej.judge_id
       WHERE ej.event_id = $1`,
      [id]
    );

    // 获取选手
    const contestants = await db.query(
      `SELECT u.id, u.username, u.name 
       FROM users u
       JOIN event_contestants ec ON u.id = ec.contestant_id
       WHERE ec.event_id = $1`,
      [id]
    );

    // 获取模块
    const modules = await db.query(
      `SELECT * FROM modules WHERE event_id = $1 ORDER BY created_at`,
      [id]
    );

    res.json({
      ...event,
      chief_judges: chiefJudges.rows,
      judges: judges.rows,
      contestants: contestants.rows,
      modules: modules.rows
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const { competition_id, name, start_time, end_time } = req.body;

    const result = await db.query(
      `INSERT INTO events (competition_id, name, start_time, end_time) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [competition_id, name, start_time, end_time]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_time, end_time } = req.body;

    const result = await db.query(
      `UPDATE events 
       SET name = $1, start_time = $2, end_time = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 
       RETURNING *`,
      [name, start_time, end_time, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM events WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

// 分配裁判长
exports.assignChiefJudge = async (req, res) => {
  try {
    const { id } = req.params;
    const { chief_judge_id } = req.body;

    await db.query(
      `INSERT INTO event_chief_judges (event_id, chief_judge_id) 
       VALUES ($1, $2) 
       ON CONFLICT DO NOTHING`,
      [id, chief_judge_id]
    );

    res.json({ message: 'Chief judge assigned successfully' });
  } catch (error) {
    console.error('Assign chief judge error:', error);
    res.status(500).json({ error: 'Failed to assign chief judge' });
  }
};

// 移除裁判长
exports.removeChiefJudge = async (req, res) => {
  try {
    const { id, chief_judge_id } = req.params;

    await db.query(
      'DELETE FROM event_chief_judges WHERE event_id = $1 AND chief_judge_id = $2',
      [id, chief_judge_id]
    );

    res.json({ message: 'Chief judge removed successfully' });
  } catch (error) {
    console.error('Remove chief judge error:', error);
    res.status(500).json({ error: 'Failed to remove chief judge' });
  }
};

// 分配裁判
exports.assignJudge = async (req, res) => {
  try {
    const { id } = req.params;
    const { judge_id } = req.body;

    await db.query(
      `INSERT INTO event_judges (event_id, judge_id) 
       VALUES ($1, $2) 
       ON CONFLICT DO NOTHING`,
      [id, judge_id]
    );

    res.json({ message: 'Judge assigned successfully' });
  } catch (error) {
    console.error('Assign judge error:', error);
    res.status(500).json({ error: 'Failed to assign judge' });
  }
};

// 移除裁判
exports.removeJudge = async (req, res) => {
  try {
    const { id, judge_id } = req.params;

    await db.query(
      'DELETE FROM event_judges WHERE event_id = $1 AND judge_id = $2',
      [id, judge_id]
    );

    res.json({ message: 'Judge removed successfully' });
  } catch (error) {
    console.error('Remove judge error:', error);
    res.status(500).json({ error: 'Failed to remove judge' });
  }
};

// 分配选手
exports.assignContestant = async (req, res) => {
  try {
    const { id } = req.params;
    const { contestant_id } = req.body;

    await db.query(
      `INSERT INTO event_contestants (event_id, contestant_id) 
       VALUES ($1, $2) 
       ON CONFLICT DO NOTHING`,
      [id, contestant_id]
    );

    res.json({ message: 'Contestant assigned successfully' });
  } catch (error) {
    console.error('Assign contestant error:', error);
    res.status(500).json({ error: 'Failed to assign contestant' });
  }
};

// 移除选手
exports.removeContestant = async (req, res) => {
  try {
    const { id, contestant_id } = req.params;

    await db.query(
      'DELETE FROM event_contestants WHERE event_id = $1 AND contestant_id = $2',
      [id, contestant_id]
    );

    res.json({ message: 'Contestant removed successfully' });
  } catch (error) {
    console.error('Remove contestant error:', error);
    res.status(500).json({ error: 'Failed to remove contestant' });
  }
};

// 分配裁判-选手
exports.assignJudgeContestant = async (req, res) => {
  try {
    const { id } = req.params;
    const { judge_id, contestant_id } = req.body;

    await db.query(
      `INSERT INTO judge_contestant_assignments (event_id, judge_id, contestant_id) 
       VALUES ($1, $2, $3) 
       ON CONFLICT DO NOTHING`,
      [id, judge_id, contestant_id]
    );

    res.json({ message: 'Judge-contestant assignment created successfully' });
  } catch (error) {
    console.error('Assign judge-contestant error:', error);
    res.status(500).json({ error: 'Failed to assign judge to contestant' });
  }
};

// 移除裁判-选手分配
exports.removeJudgeContestant = async (req, res) => {
  try {
    const { id } = req.params;
    const { judge_id, contestant_id } = req.query;

    await db.query(
      'DELETE FROM judge_contestant_assignments WHERE event_id = $1 AND judge_id = $2 AND contestant_id = $3',
      [id, judge_id, contestant_id]
    );

    res.json({ message: 'Judge-contestant assignment removed successfully' });
  } catch (error) {
    console.error('Remove judge-contestant error:', error);
    res.status(500).json({ error: 'Failed to remove judge-contestant assignment' });
  }
};

// 获取裁判-选手分配关系
exports.getJudgeContestantAssignments = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // 检查权限
    const hasAccess = await hasEventAccess(user.id, id, user.role);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(`
      SELECT 
        jca.judge_id,
        jca.contestant_id,
        j.name as judge_name,
        j.username as judge_username,
        c.name as contestant_name,
        c.username as contestant_username
      FROM judge_contestant_assignments jca
      LEFT JOIN users j ON jca.judge_id = j.id
      LEFT JOIN users c ON jca.contestant_id = c.id
      WHERE jca.event_id = $1
      ORDER BY j.name, c.name
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get judge-contestant assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch judge-contestant assignments' });
  }
};
