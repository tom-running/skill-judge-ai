const OpenAI = require('openai');
require('dotenv').config();

class AIEvaluatorRegistry {
  constructor() {
    this.evaluators = new Map();
  }

  register(moduleId, evaluatorFunction) {
    // 确保 moduleId 始终为字符串类型
    const normalizedModuleId = String(moduleId);
    this.evaluators.set(normalizedModuleId, evaluatorFunction);
    console.log(`AI evaluator registered for module ID: ${normalizedModuleId}`);
  }

  async evaluate(moduleId, scoringCriteria, problemAttachments, answerAttachments) {
    // 确保 moduleId 始终为字符串类型
    const normalizedModuleId = String(moduleId);
    const evaluator = this.evaluators.get(normalizedModuleId);
    if (!evaluator) {
      console.log(`No AI evaluator found for module ID: ${normalizedModuleId}`);
      return null;
    }

    try {
      return await evaluator(scoringCriteria, problemAttachments, answerAttachments);
    } catch (error) {
      console.error(`AI evaluation error for module ${normalizedModuleId}:`, error);
      throw error;
    }
  }

  hasEvaluator(moduleId) {
    // 确保 moduleId 始终为字符串类型
    const normalizedModuleId = String(moduleId);
    return this.evaluators.has(normalizedModuleId);
  }
}

const aiRegistry = new AIEvaluatorRegistry();

// OpenAI客户端配置
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

async function callVisionModel(imageUrl, prompt, isObjective = false) {
  try {
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }
    ];

    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'qwen3-vl-32b',
      messages: messages,
      max_tokens: isObjective ? 50 : 500,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Vision model call error:', error);
    throw error;
  }
}

module.exports = {
  aiRegistry,
  callVisionModel,
};
