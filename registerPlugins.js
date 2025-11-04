/**
 * AI评估插件注册示例
 * 
 * 此文件展示如何为特定模块注册AI评估插件
 * 在实际使用中，需要在创建模块后调用注册函数
 */

const { registerAppPrototypeEvaluator } = require('./src/plugins/appPrototypeEvaluator');

/**
 * 为APP原型设计模块注册评估器
 * 
 * 使用方法：
 * 1. 创建一个名为"APP原型设计"的模块，记下模块ID
 * 2. 调用此函数注册评估器
 * 3. 当模块状态变为"finished"时，会自动触发AI评估
 * 
 * @param {number} moduleId - 模块ID
 */
function registerAppPrototypePlugin(moduleId) {
  registerAppPrototypeEvaluator(moduleId);
  console.log(`APP原型设计评估器已注册到模块 ${moduleId}`);
}

/**
 * 批量注册示例
 * 
 * 如果你有多个APP原型设计模块需要评估，可以批量注册
 */
function registerMultipleModules() {
  // 示例：假设模块ID为 1, 2, 3
  const appPrototypeModuleIds = [1, 2, 3];
  
  appPrototypeModuleIds.forEach(moduleId => {
    registerAppPrototypePlugin(moduleId);
  });
}

/**
 * 动态注册：通过数据库查询模块并注册
 * 
 * 这个函数会查找所有名为"APP原型设计"的模块并自动注册评估器
 */
async function autoRegisterAppPrototypeModules() {
  const db = require('./src/config/database');
  
  try {
    const result = await db.query(
      "SELECT id FROM modules WHERE name LIKE '%APP原型设计%' OR name LIKE '%app原型设计%'"
    );
    
    result.rows.forEach(row => {
      registerAppPrototypePlugin(row.id);
    });
    
    console.log(`已自动注册 ${result.rows.length} 个APP原型设计模块`);
  } catch (error) {
    console.error('自动注册失败:', error);
  }
}

/**
 * 在应用启动时自动注册
 * 
 * 将此代码添加到 src/app.js 中，在服务器启动后执行
 */
async function initializePlugins() {
  console.log('正在初始化AI评估插件...');
  await autoRegisterAppPrototypeModules();
  console.log('AI评估插件初始化完成');
}

// 导出函数供其他模块使用
module.exports = {
  registerAppPrototypePlugin,
  registerMultipleModules,
  autoRegisterAppPrototypeModules,
  initializePlugins
};

// 如果直接运行此脚本，执行初始化
if (require.main === module) {
  require('dotenv').config();
  initializePlugins().then(() => {
    console.log('插件注册完成');
    process.exit(0);
  }).catch(error => {
    console.error('插件注册失败:', error);
    process.exit(1);
  });
}
