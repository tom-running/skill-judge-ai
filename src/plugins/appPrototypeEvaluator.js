const path = require('path');
const fs = require('fs').promises;
const { aiRegistry, callVisionModel } = require('../services/aiEvaluator');

/**
 * APP原型设计评估器插件
 * 选手提交01.jpeg到10.jpeg共10张图
 * 评分项描述中会指定评估哪张图
 */
async function appPrototypeEvaluator(scoringCriteria, problemAttachments, answerAttachments) {
  const results = [];

  for (const item of scoringCriteria.items) {
    console.log(`Evaluating scoring item ${item.id}`);
    try {
      // 从评分项描述中提取图片编号
      const imageMatch = item.description.match(/(\d{2})\.jpeg/);
      if (!imageMatch) {
        console.log(`No image specified in scoring item ${item.id}`);
        results.push({
          scoring_item_id: item.id,
          ai_score: null,
          ai_suggestion: '评分项描述中未指定要评估的图片'
        });
        continue;
      }

      const imageNumber = imageMatch[1];
      const targetFilename = `${imageNumber}.jpeg`;

      // 查找对应的答题附件
      const attachment = answerAttachments.find(att => 
        att.filename.toLowerCase() === targetFilename.toLowerCase()
      );

      if (!attachment) {
        console.log(`Attachment ${targetFilename} not found for scoring item ${item.id}`);
        results.push({
          scoring_item_id: item.id,
          ai_score: null,
          ai_suggestion: `未找到答题附件：${targetFilename}`
        });
        continue;
      }

      // 读取图片文件并转换为base64
      const imageBuffer = await fs.readFile(attachment.filepath);
      const base64Image = imageBuffer.toString('base64');
      const imageUrl = `data:image/jpeg;base64,${base64Image}`;

      // 构建评估提示词
      let prompt;
      if (item.evaluation_type === 'objective') {
        prompt = `请根据以下标准对图片进行客观评分：
${item.description}

满分：${item.max_score}分

请直接给出数字分数（保留两位小数），不要有其他说明文字。`;
      } else {
        prompt = `请根据以下标准对图片进行主观评估：
${item.description}

请提供详细的评估建议和改进意见。`;
      }

      console.log(`Calling AI model for scoring item ${item.id} with image ${targetFilename}, prompt: ${prompt}`);

      // 调用AI模型
      const response = await callVisionModel(imageUrl, prompt, item.evaluation_type === 'objective');

      if (item.evaluation_type === 'objective') {
        // 提取数字分数
        const scoreMatch = response.match(/[\d.]+/);
        const score = scoreMatch ? parseFloat(scoreMatch[0]) : 0;
        const finalScore = Math.min(score, item.max_score);

        results.push({
          scoring_item_id: item.id,
          ai_score: finalScore,
          ai_suggestion: null
        });
      } else {
        results.push({
          scoring_item_id: item.id,
          ai_score: null,
          ai_suggestion: response
        });
      }

    } catch (error) {
      console.error(`Error evaluating scoring item ${item.id}:`, error);
      results.push({
        scoring_item_id: item.id,
        ai_score: null,
        ai_suggestion: `评估出错：${error.message}`
      });
    }
  }

  return results;
}

// 注册评估器 - 这个函数需要在模块创建时调用
function registerAppPrototypeEvaluator(moduleId) {
  aiRegistry.register(moduleId, appPrototypeEvaluator);
}

module.exports = {
  registerAppPrototypeEvaluator,
};
