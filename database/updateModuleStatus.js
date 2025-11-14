const db = require('../src/config/database');

async function updateModuleStatus() {
  try {
    console.log('Updating module status constraints...');
    
    // 删除旧的约束
    await db.query(`
      ALTER TABLE modules 
      DROP CONSTRAINT IF EXISTS modules_status_check;
    `);
    
    // 添加新的约束
    await db.query(`
      ALTER TABLE modules 
      ADD CONSTRAINT modules_status_check 
      CHECK (status IN ('pending', 'in_progress', 'finished', 'scoring', 'scoring_finished'));
    `);
    
    console.log('Module status constraints updated successfully!');
    console.log('New status options: pending, in_progress, finished, scoring, scoring_finished');
    
    process.exit(0);
  } catch (error) {
    console.error('Update module status error:', error);
    process.exit(1);
  }
}

updateModuleStatus();