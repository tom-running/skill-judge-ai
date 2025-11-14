const bcrypt = require('bcryptjs');
const db = require('../src/config/database');

async function createTestData() {
  try {
    console.log('Creating test data...');

    // 创建测试用户
    const password = await bcrypt.hash('test123', 10);
    
    // 创建裁判长
    const chiefJudge = await db.query(
      `INSERT INTO users (username, password, name, role) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (username) DO UPDATE SET password = $2
       RETURNING id`,
      ['chief_judge1', password, '王裁判长', 'chief_judge']
    );
    console.log('✓ Created chief judge');

    // 创建裁判
    const judge1 = await db.query(
      `INSERT INTO users (username, password, name, role) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (username) DO UPDATE SET password = $2
       RETURNING id`,
      ['judge1', password, '李裁判', 'judge']
    );
    const judge2 = await db.query(
      `INSERT INTO users (username, password, name, role) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (username) DO UPDATE SET password = $2
       RETURNING id`,
      ['judge2', password, '张裁判', 'judge']
    );
    console.log('✓ Created judges');

    // 创建选手
    const contestant1 = await db.query(
      `INSERT INTO users (username, password, name, role) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (username) DO UPDATE SET password = $2
       RETURNING id`,
      ['contestant1', password, '选手A', 'contestant']
    );
    const contestant2 = await db.query(
      `INSERT INTO users (username, password, name, role) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (username) DO UPDATE SET password = $2
       RETURNING id`,
      ['contestant2', password, '选手B', 'contestant']
    );
    const contestant3 = await db.query(
      `INSERT INTO users (username, password, name, role) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (username) DO UPDATE SET password = $2
       RETURNING id`,
      ['contestant3', password, '选手C', 'contestant']
    );
    console.log('✓ Created contestants');

    // 创建赛事
    const competition = await db.query(
      `INSERT INTO competitions (name, start_time, end_time) 
       VALUES ($1, $2, $3) 
       RETURNING id`,
      [
        '第三届中华人民共和国职业技能大赛',
        '2024-01-15 08:00:00',
        '2024-01-20 18:00:00'
      ]
    );
    console.log('✓ Created competition');

    // 创建赛项
    const event = await db.query(
      `INSERT INTO events (competition_id, name, start_time, end_time) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [
        competition.rows[0].id,
        '移动应用开发',
        '2024-01-15 09:00:00',
        '2024-01-18 17:00:00'
      ]
    );
    const eventId = event.rows[0].id;
    console.log('✓ Created event');

    // 分配裁判长
    await db.query(
      `INSERT INTO event_chief_judges (event_id, chief_judge_id) 
       VALUES ($1, $2) 
       ON CONFLICT DO NOTHING`,
      [eventId, chiefJudge.rows[0].id]
    );

    // 分配裁判
    await db.query(
      `INSERT INTO event_judges (event_id, judge_id) 
       VALUES ($1, $2) 
       ON CONFLICT DO NOTHING`,
      [eventId, judge1.rows[0].id]
    );
    await db.query(
      `INSERT INTO event_judges (event_id, judge_id) 
       VALUES ($1, $2) 
       ON CONFLICT DO NOTHING`,
      [eventId, judge2.rows[0].id]
    );

    // 分配选手
    await db.query(
      `INSERT INTO event_contestants (event_id, contestant_id) 
       VALUES ($1, $2) 
       ON CONFLICT DO NOTHING`,
      [eventId, contestant1.rows[0].id]
    );
    await db.query(
      `INSERT INTO event_contestants (event_id, contestant_id) 
       VALUES ($1, $2) 
       ON CONFLICT DO NOTHING`,
      [eventId, contestant2.rows[0].id]
    );
    await db.query(
      `INSERT INTO event_contestants (event_id, contestant_id) 
       VALUES ($1, $2) 
       ON CONFLICT DO NOTHING`,
      [eventId, contestant3.rows[0].id]
    );

    // 分配裁判-选手关系
    await db.query(
      `INSERT INTO judge_contestant_assignments (event_id, judge_id, contestant_id) 
       VALUES ($1, $2, $3) 
       ON CONFLICT DO NOTHING`,
      [eventId, judge1.rows[0].id, contestant1.rows[0].id]
    );
    await db.query(
      `INSERT INTO judge_contestant_assignments (event_id, judge_id, contestant_id) 
       VALUES ($1, $2, $3) 
       ON CONFLICT DO NOTHING`,
      [eventId, judge1.rows[0].id, contestant2.rows[0].id]
    );
    await db.query(
      `INSERT INTO judge_contestant_assignments (event_id, judge_id, contestant_id) 
       VALUES ($1, $2, $3) 
       ON CONFLICT DO NOTHING`,
      [eventId, judge2.rows[0].id, contestant3.rows[0].id]
    );

    console.log('✓ Assigned judges and contestants');

    // 创建模块
    const module1 = await db.query(
      `INSERT INTO modules (event_id, name, duration_minutes, status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [eventId, 'APP原型设计', 180, 'pending']
    );
    const module2 = await db.query(
      `INSERT INTO modules (event_id, name, duration_minutes, status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [eventId, 'APP界面实现', 240, 'pending']
    );
    const module3 = await db.query(
      `INSERT INTO modules (event_id, name, duration_minutes, status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [eventId, 'APP功能开发', 300, 'pending']
    );
    console.log('✓ Created modules');

    // 为第一个模块创建评分标准
    const criteria = await db.query(
      `INSERT INTO scoring_criteria (module_id) 
       VALUES ($1) 
       RETURNING id`,
      [module1.rows[0].id]
    );

    // 添加评分项
    await db.query(
      `INSERT INTO scoring_items (criteria_id, description, evaluation_type, max_score, sort_order) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        criteria.rows[0].id,
        '评估 01.jpeg 的整体界面布局合理性和美观度',
        'subjective',
        10.00,
        1
      ]
    );
    await db.query(
      `INSERT INTO scoring_items (criteria_id, description, evaluation_type, max_score, sort_order) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        criteria.rows[0].id,
        '评估 02.jpeg 的色彩搭配是否符合设计规范',
        'objective',
        15.00,
        2
      ]
    );
    await db.query(
      `INSERT INTO scoring_items (criteria_id, description, evaluation_type, max_score, sort_order) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        criteria.rows[0].id,
        '评估 03.jpeg 的导航结构是否清晰易用',
        'objective',
        15.00,
        3
      ]
    );
    await db.query(
      `INSERT INTO scoring_items (criteria_id, description, evaluation_type, max_score, sort_order) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        criteria.rows[0].id,
        '评估 04.jpeg 的交互设计创新性和用户体验',
        'subjective',
        20.00,
        4
      ]
    );

    console.log('✓ Created scoring criteria and items');

    console.log('\n=== Test Data Created Successfully! ===\n');
    console.log('You can now login with the following accounts:');
    console.log('- Admin: admin / admin123');
    console.log('- Chief Judge: chief_judge1 / test123');
    console.log('- Judge 1: judge1 / test123');
    console.log('- Judge 2: judge2 / test123');
    console.log('- Contestant A: contestant1 / test123');
    console.log('- Contestant B: contestant2 / test123');
    console.log('- Contestant C: contestant3 / test123');
    console.log('\nCompetition: 第三届中华人民共和国职业技能大赛');
    console.log('Event: 移动应用开发');
    console.log('Modules: APP原型设计, APP界面实现, APP功能开发');
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('Error creating test data:', error);
    process.exit(1);
  }
}

createTestData();
