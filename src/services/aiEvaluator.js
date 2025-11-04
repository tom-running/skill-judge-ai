const OpenAI = require('openai');
require('dotenv').config();

class AIEvaluatorRegistry {
  constructor() {
    this.evaluators = new Map();
  }

  register(moduleId, evaluatorFunction) {
    this.evaluators.set(moduleId, evaluatorFunction);
    console.log(`AI evaluator registered for module ID: ${moduleId}`);
  }

  async evaluate(moduleId, scoringCriteria, problemAttachments, answerAttachments) {
    const evaluator = this.evaluators.get(moduleId);
    if (!evaluator) {
      console.log(`No AI evaluator found for module ID: ${moduleId}`);
      return null;
    }

    try {
      return await evaluator(scoringCriteria, problemAttachments, answerAttachments);
    } catch (error) {
      console.error(`AI evaluation error for module ${moduleId}:`, error);
      throw error;
    }
  }

  hasEvaluator(moduleId) {
    return this.evaluators.has(moduleId);
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
