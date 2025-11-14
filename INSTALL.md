# 安装和部署指南

## 系统要求

- Node.js 14 或更高版本
- PostgreSQL 12 或更高版本
- 至少 1GB 可用内存
- 至少 5GB 可用磁盘空间

## 详细安装步骤

### 1. 安装 Node.js

#### Ubuntu/Debian
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### macOS
```bash
brew install node
```

#### Windows
下载并安装 [Node.js](https://nodejs.org/)

### 2. 安装 PostgreSQL

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS
```bash
brew install postgresql
brew services start postgresql
```

#### Windows
下载并安装 [PostgreSQL](https://www.postgresql.org/download/windows/)

### 3. 配置 PostgreSQL

```bash
# 登录 PostgreSQL
sudo -u postgres psql

# 在 PostgreSQL 命令行中执行以下命令：
CREATE DATABASE skill_judge_ai;
CREATE USER skill_judge WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE skill_judge_ai TO skill_judge;

# 退出 PostgreSQL
\q
```

### 4. 克隆并配置项目

```bash
# 克隆项目
git clone <repository-url>
cd skill-judge-ai

# 安装依赖
npm install

# 创建 .env 文件
cp .env.example .env
```

### 5. 编辑 .env 文件

使用你喜欢的编辑器打开 `.env` 文件并修改以下配置：

```env
PORT=3000
DATABASE_URL=postgresql://skill_judge:your_password_here@localhost:5432/skill_judge_ai
JWT_SECRET=请生成一个随机的长字符串作为密钥
OPENAI_API_KEY=你的OpenAI API密钥
OPENAI_BASE_URL=https://api.openai.com/v1
AI_MODEL=qwen3-vl-32b
```

生成 JWT_SECRET 的方法：
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 6. 运行数据库迁移

```bash
npm run migrate
```

成功后会看到：
```
Starting database migration...
Database migration completed successfully!
Default admin user created (username: admin, password: admin123)
```

### 7. 启动服务器

```bash
# 开发模式（推荐用于测试）
npm run dev

# 生产模式
npm start
```

### 8. 访问系统

打开浏览器访问 `http://localhost:3000`

使用默认管理员账号登录：
- 用户名: `admin`
- 密码: `admin123`

**重要**: 首次登录后请立即修改管理员密码！

## 生产环境部署

### 使用 PM2 管理进程

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start src/app.js --name skill-judge-ai

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs skill-judge-ai

# 重启应用
pm2 restart skill-judge-ai

# 停止应用
pm2 stop skill-judge-ai
```

### 使用 Nginx 作为反向代理

创建 Nginx 配置文件 `/etc/nginx/sites-available/skill-judge-ai`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 100M;
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/skill-judge-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 配置 HTTPS（推荐）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com
```

## 故障排除

### 数据库连接失败

检查 PostgreSQL 是否运行：
```bash
sudo systemctl status postgresql
```

检查 `.env` 中的数据库连接字符串是否正确。

### 端口已被占用

修改 `.env` 中的 `PORT` 值为其他可用端口。

### 文件上传失败

确保 `uploads/` 目录存在且有写入权限：
```bash
mkdir -p uploads
chmod 755 uploads
```

### AI 评估失败

1. 检查 `OPENAI_API_KEY` 是否正确
2. 检查 `OPENAI_BASE_URL` 是否可访问
3. 检查网络连接
4. 查看应用日志了解详细错误信息

## 数据备份

定期备份数据库：
```bash
# 备份数据库
pg_dump -U skill_judge skill_judge_ai > backup_$(date +%Y%m%d).sql

# 恢复数据库
psql -U skill_judge skill_judge_ai < backup_20240101.sql
```

备份上传文件：
```bash
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
```

## 更新系统

```bash
# 停止服务
pm2 stop skill-judge-ai

# 拉取最新代码
git pull

# 安装新依赖
npm install

# 运行迁移（如有新的数据库变更）
npm run migrate

# 重启服务
pm2 restart skill-judge-ai
```

## 性能优化建议

1. 使用 PostgreSQL 连接池（已在代码中实现）
2. 启用 Nginx 缓存静态资源
3. 使用 CDN 加速前端资源
4. 定期清理不需要的附件文件
5. 为数据库创建适当的索引（已在迁移脚本中实现）

## 安全建议

1. 使用强密码并定期更换
2. 限制数据库访问权限
3. 使用 HTTPS
4. 定期更新依赖包
5. 启用防火墙，只开放必要端口
6. 定期备份数据
7. 监控系统日志
