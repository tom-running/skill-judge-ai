const db = require('../config/database');

exports.getAllCompetitions = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM competitions ORDER BY start_time DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get competitions error:', error);
    res.status(500).json({ error: 'Failed to fetch competitions' });
  }
};

exports.getCompetitionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'SELECT * FROM competitions WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Competition not found' });
    }

    // 获取关联的赛项
    const eventsResult = await db.query(
      'SELECT * FROM events WHERE competition_id = $1 ORDER BY start_time',
      [id]
    );

    res.json({
      ...result.rows[0],
      events: eventsResult.rows
    });
  } catch (error) {
    console.error('Get competition error:', error);
    res.status(500).json({ error: 'Failed to fetch competition' });
  }
};

exports.createCompetition = async (req, res) => {
  try {
    const { name, start_time, end_time } = req.body;

    const result = await db.query(
      `INSERT INTO competitions (name, start_time, end_time) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [name, start_time, end_time]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create competition error:', error);
    res.status(500).json({ error: 'Failed to create competition' });
  }
};

exports.updateCompetition = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_time, end_time } = req.body;

    const result = await db.query(
      `UPDATE competitions 
       SET name = $1, start_time = $2, end_time = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 
       RETURNING *`,
      [name, start_time, end_time, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Competition not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update competition error:', error);
    res.status(500).json({ error: 'Failed to update competition' });
  }
};

exports.deleteCompetition = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM competitions WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Competition not found' });
    }

    res.json({ message: 'Competition deleted successfully' });
  } catch (error) {
    console.error('Delete competition error:', error);
    res.status(500).json({ error: 'Failed to delete competition' });
  }
};
