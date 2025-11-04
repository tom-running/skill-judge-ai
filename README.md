# 世界职业技能大赛 AI 评分系统

基于 Node.js 的前后端一体化系统，使用 PostgreSQL 作为数据库，支持用户管理、赛事管理、赛项管理、模块管理及 AI 插件化评分功能。

## 功能特性

- **用户管理**: 支持管理员、裁判长、裁判、选手四种角色，基于角色的权限控制
- **赛事管理**: 创建和管理赛事，关联多个赛项
- **赛项管理**: 管理赛项，分配裁判长、裁判和选手
- **模块管理**: 管理比赛模块，包含赛题、答题、评分标准
- **评分管理**: 支持裁判评分和 AI 评分，可查看评分详情
- **AI 评估插件**: 插件化 AI 评估机制，支持多模态模型（如 qwen3-vl-32b）
- **附件管理**: 支持赛题和答题附件的上传下载

## 技术栈

- **后端**: Node.js + Express
- **前端**: React + Ant Design
- **数据库**: PostgreSQL
- **AI 模型**: OpenAI 兼容协议调用 qwen3-vl-32b

## 快速开始

### 前置要求

- Node.js >= 14
- PostgreSQL >= 12

### 安装步骤

1. 克隆仓库
```bash
git clone <repository-url>
cd skill-judge-ai
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量

复制 `.env.example` 到 `.env` 并修改配置：
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/skill_judge_ai
JWT_SECRET=your-secret-key-change-in-production
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
AI_MODEL=qwen3-vl-32b
```

4. 创建数据库
```bash
# 登录 PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE skill_judge_ai;

# 退出
\q
```

5. 运行数据库迁移
```bash
npm run migrate
```

这将创建所有必要的数据表，并创建一个默认的管理员账号：
- 用户名: `admin`
- 密码: `admin123`

6. 启动服务器
```bash
# 开发模式（带热重载）
npm run dev

# 生产模式
npm start
```

7. 访问应用

打开浏览器访问 `http://localhost:3000`

## 测试数据

如果你想快速测试系统功能，可以创建测试数据：

```bash
npm run test-data
```

这将创建以下测试账号：
- 裁判长: chief_judge1 / test123
- 裁判: judge1, judge2 / test123
- 选手: contestant1, contestant2, contestant3 / test123

以及一个示例赛事"第三届中华人民共和国职业技能大赛"和相关的赛项、模块。

## 目录结构

```
skill-judge-ai/
├── database/           # 数据库迁移脚本
│   └── migrate.js
├── public/            # 前端静态文件
│   └── index.html
├── src/
│   ├── config/        # 配置文件
│   │   └── database.js
│   ├── controllers/   # 控制器
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── competitionController.js
│   │   ├── eventController.js
│   │   ├── moduleController.js
│   │   ├── attachmentController.js
│   │   └── scoringController.js
│   ├── middleware/    # 中间件
│   │   ├── auth.js
│   │   └── permissions.js
│   ├── routes/        # 路由
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── competitions.js
│   │   ├── events.js
│   │   ├── modules.js
│   │   ├── attachments.js
│   │   └── scoring.js
│   ├── services/      # 服务
│   │   └── aiEvaluator.js
│   ├── plugins/       # AI 评估插件
│   │   └── appPrototypeEvaluator.js
│   └── app.js         # 应用入口
├── uploads/           # 文件上传目录
├── .env.example       # 环境变量示例
├── .gitignore
├── package.json
└── README.md
```

## API 文档

### 认证

- `POST /api/auth/login` - 用户登录
- `GET /api/auth/profile` - 获取当前用户信息

### 用户管理

- `GET /api/users` - 获取用户列表
- `POST /api/users` - 创建用户
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户

### 赛事管理

- `GET /api/competitions` - 获取赛事列表
- `GET /api/competitions/:id` - 获取赛事详情
- `POST /api/competitions` - 创建赛事
- `PUT /api/competitions/:id` - 更新赛事
- `DELETE /api/competitions/:id` - 删除赛事

### 赛项管理

- `GET /api/events` - 获取赛项列表
- `GET /api/events/:id` - 获取赛项详情
- `POST /api/events` - 创建赛项
- `PUT /api/events/:id` - 更新赛项
- `DELETE /api/events/:id` - 删除赛项
- `POST /api/events/:id/chief-judges` - 分配裁判长
- `POST /api/events/:id/judges` - 分配裁判
- `POST /api/events/:id/contestants` - 分配选手
- `POST /api/events/:id/judge-contestants` - 分配裁判-选手

### 模块管理

- `GET /api/modules` - 获取模块列表
- `GET /api/modules/:id` - 获取模块详情
- `POST /api/modules` - 创建模块
- `PUT /api/modules/:id` - 更新模块
- `DELETE /api/modules/:id` - 删除模块
- `PATCH /api/modules/:id/status` - 更新模块状态

### 评分管理

- `GET /api/scoring/modules/:module_id/criteria` - 获取评分标准
- `POST /api/scoring/modules/:module_id/criteria` - 创建评分标准
- `POST /api/scoring/criteria/:criteria_id/items` - 添加评分项
- `PUT /api/scoring/items/:id` - 更新评分项
- `DELETE /api/scoring/items/:id` - 删除评分项
- `GET /api/scoring/modules/:module_id/records` - 获取评分记录
- `PUT /api/scoring/modules/:module_id/contestants/:contestant_id/score` - 更新裁判评分

### 附件管理

- `POST /api/attachments/modules/:module_id/problem` - 上传赛题附件
- `GET /api/attachments/modules/:module_id/problem` - 获取赛题附件
- `POST /api/attachments/modules/:module_id/answer` - 上传答题附件
- `GET /api/attachments/modules/:module_id/contestants/:contestant_id/answer` - 获取答题附件

## AI 评估插件机制

系统支持插件化的 AI 评估功能。当模块状态变为"已结束"时，系统会自动检查是否有注册的 AI 评估插件，如果有则调用插件进行评估。

### 示例：APP 原型设计评估器

位于 `src/plugins/appPrototypeEvaluator.js`，该插件用于评估 APP 原型设计：

1. 选手提交 01.jpeg 到 10.jpeg 共 10 张图片
2. 评分项描述中指定要评估哪张图（如"评估 03.jpeg 的导航结构"）
3. 插件调用 qwen3-vl-32b 多模态模型进行评估
4. 对于客观题，返回分数；对于主观题，返回评估建议

### 注册插件

```javascript
const { registerAppPrototypeEvaluator } = require('./src/plugins/appPrototypeEvaluator');

// 为某个模块注册评估器
registerAppPrototypeEvaluator(moduleId);
```

### 创建自定义插件

```javascript
const { aiRegistry } = require('./src/services/aiEvaluator');

function customEvaluator(scoringCriteria, problemAttachments, answerAttachments) {
  // 实现评估逻辑
  // 返回评分结果数组
  return [
    {
      scoring_item_id: 1,
      ai_score: 85.5,  // 客观题分数
      ai_suggestion: null
    },
    {
      scoring_item_id: 2,
      ai_score: null,
      ai_suggestion: "设计创新，建议优化配色"  // 主观题建议
    }
  ];
}

// 注册插件
aiRegistry.register(moduleId, customEvaluator);
```

## 权限控制

系统实现了基于角色的访问控制（RBAC）：

- **管理员 (admin)**: 拥有全部权限
- **裁判长 (chief_judge)**: 可访问管理员分配的赛项及其下所有数据
- **裁判 (judge)**: 仅可访问裁判长分配的赛项中指定选手的答题和评分
- **选手 (contestant)**: 仅可查看自己参与的模块、提交答题附件

## 注意事项

1. 首次运行前必须配置正确的数据库连接和环境变量
2. AI 评估功能需要配置有效的 OpenAI API Key 和兼容的模型端点
3. 文件上传存储在 `uploads/` 目录，生产环境建议使用云存储
4. 默认管理员密码应在首次登录后立即修改

## 开发

```bash
# 安装依赖
npm install

# 开发模式（带热重载）
npm run dev

# 生产模式
npm start
```

## License

ISC
