const db = require('../src/config/database');

const schema = `
-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'chief_judge', 'judge', 'contestant')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 赛事表
CREATE TABLE IF NOT EXISTS competitions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 赛项表
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  competition_id INTEGER REFERENCES competitions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 赛项-裁判长关联表
CREATE TABLE IF NOT EXISTS event_chief_judges (
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  chief_judge_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, chief_judge_id)
);

-- 赛项-裁判关联表
CREATE TABLE IF NOT EXISTS event_judges (
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  judge_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, judge_id)
);

-- 赛项-选手关联表
CREATE TABLE IF NOT EXISTS event_contestants (
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  contestant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, contestant_id)
);

-- 模块表
CREATE TABLE IF NOT EXISTS modules (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'finished')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 赛题附件表
CREATE TABLE IF NOT EXISTS problem_attachments (
  id SERIAL PRIMARY KEY,
  module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  filepath VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 答题附件表
CREATE TABLE IF NOT EXISTS answer_attachments (
  id SERIAL PRIMARY KEY,
  module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
  contestant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  filepath VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 评分标准表
CREATE TABLE IF NOT EXISTS scoring_criteria (
  id SERIAL PRIMARY KEY,
  module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 评分项表
CREATE TABLE IF NOT EXISTS scoring_items (
  id SERIAL PRIMARY KEY,
  criteria_id INTEGER REFERENCES scoring_criteria(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  evaluation_type VARCHAR(50) NOT NULL CHECK (evaluation_type IN ('subjective', 'objective')),
  max_score DECIMAL(10, 2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 评分记录表
CREATE TABLE IF NOT EXISTS scoring_records (
  id SERIAL PRIMARY KEY,
  module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
  contestant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(module_id, contestant_id)
);

-- 评分项结果表
CREATE TABLE IF NOT EXISTS scoring_item_results (
  id SERIAL PRIMARY KEY,
  scoring_record_id INTEGER REFERENCES scoring_records(id) ON DELETE CASCADE,
  scoring_item_id INTEGER REFERENCES scoring_items(id) ON DELETE CASCADE,
  judge_score DECIMAL(10, 2),
  ai_score DECIMAL(10, 2),
  ai_suggestion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scoring_record_id, scoring_item_id)
);

-- 裁判-选手分配表（裁判只能看到分配给自己的选手）
CREATE TABLE IF NOT EXISTS judge_contestant_assignments (
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  judge_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  contestant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, judge_id, contestant_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_events_competition ON events(competition_id);
CREATE INDEX IF NOT EXISTS idx_modules_event ON modules(event_id);
CREATE INDEX IF NOT EXISTS idx_problem_attachments_module ON problem_attachments(module_id);
CREATE INDEX IF NOT EXISTS idx_answer_attachments_module_contestant ON answer_attachments(module_id, contestant_id);
CREATE INDEX IF NOT EXISTS idx_scoring_criteria_module ON scoring_criteria(module_id);
CREATE INDEX IF NOT EXISTS idx_scoring_items_criteria ON scoring_items(criteria_id);
CREATE INDEX IF NOT EXISTS idx_scoring_records_module_contestant ON scoring_records(module_id, contestant_id);
CREATE INDEX IF NOT EXISTS idx_scoring_item_results_record ON scoring_item_results(scoring_record_id);
`;

async function migrate() {
  try {
    console.log('Starting database migration...');
    await db.query(schema);
    console.log('Database migration completed successfully!');
    
    // Create default admin user
    const adminPassword = require('bcryptjs').hashSync('admin123', 10);
    await db.query(`
      INSERT INTO users (username, password, name, role) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (username) DO NOTHING
    `, ['admin', adminPassword, 'Administrator', 'admin']);
    console.log('Default admin user created (username: admin, password: admin123)');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrate();
