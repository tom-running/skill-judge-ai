require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/competitions', require('./routes/competitions'));
app.use('/api/events', require('./routes/events'));
app.use('/api/modules', require('./routes/modules'));
app.use('/api/attachments', require('./routes/attachments'));
app.use('/api/scoring', require('./routes/scoring'));

// Serve frontend for any other route
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;

// 自动注册AI评估插件
async function initializePlugins() {
  try {
    const { autoRegisterAppPrototypeModules } = require('../registerPlugins');
    console.log('Initializing AI evaluation plugins...');
    await autoRegisterAppPrototypeModules();
    console.log('AI evaluation plugins initialized');
  } catch (error) {
    console.error('Failed to initialize AI plugins:', error.message);
  }
}

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
  
  // 初始化插件
  await initializePlugins();
});

module.exports = app;
