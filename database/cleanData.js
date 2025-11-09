const db = require('../src/config/database');

async function cleanDuplicateData() {
  try {
    console.log('Cleaning duplicate data...');
    
    // 检查重复的数据
    console.log('\n=== 检查重复数据 ===');
    
    const duplicateCompetitions = await db.query(`
      SELECT name, COUNT(*) as count 
      FROM competitions 
      GROUP BY name 
      HAVING COUNT(*) > 1
    `);
    console.log('重复赛事:', duplicateCompetitions.rows);
    
    const duplicateEvents = await db.query(`
      SELECT name, competition_id, COUNT(*) as count 
      FROM events 
      GROUP BY name, competition_id 
      HAVING COUNT(*) > 1
    `);
    console.log('重复赛项:', duplicateEvents.rows);
    
    const duplicateModules = await db.query(`
      SELECT name, event_id, COUNT(*) as count 
      FROM modules 
      GROUP BY name, event_id 
      HAVING COUNT(*) > 1
    `);
    console.log('重复模块:', duplicateModules.rows);
    
    // 如果需要，可以添加清理逻辑
    if (duplicateModules.rows.length > 0) {
      console.log('\n=== 清理重复模块 ===');
      for (const dup of duplicateModules.rows) {
        // 保留最新创建的，删除旧的
        const modulesToDelete = await db.query(`
          SELECT id, created_at 
          FROM modules 
          WHERE name = $1 AND event_id = $2 
          ORDER BY created_at ASC 
          LIMIT $3
        `, [dup.name, dup.event_id, dup.count - 1]);
        
        for (const module of modulesToDelete.rows) {
          await db.query('DELETE FROM modules WHERE id = $1', [module.id]);
          console.log(`删除重复模块: ${dup.name} (ID: ${module.id})`);
        }
      }
    }
    
    console.log('\n=== 清理完成 ===');
    process.exit(0);
  } catch (error) {
    console.error('Clean data error:', error);
    process.exit(1);
  }
}

cleanDuplicateData();