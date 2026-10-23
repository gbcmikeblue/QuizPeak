/**
 * PM2 进程托管（本机开发/长期挂服务用，生产请用 docker compose）
 *
 *   npx pm2 start ecosystem.config.cjs     # 启动三个服务
 *   npx pm2 list                           # 状态
 *   npx pm2 logs api                       # 看 API 日志
 *   npx pm2 restart api                    # 只重启 API
 *   npx pm2 stop all                       # 全部停止
 *   npx pm2 delete all                     # 从列表移除
 *
 * 启动前请先确保数据库在运行：npm run db:local（或 docker compose up -d postgres）
 */
const path = require('node:path');

const ROOT = __dirname;
const LOG_DIR = path.join(ROOT, '.dev', 'pm2');

// 三个前端/后端共用的运行环境（本机开发值，生产由 .env.production 覆盖）
const COMMON_ENV = {
  NODE_ENV: 'development',
  TZ: 'Asia/Shanghai',
};

const API_ENV = {
  ...COMMON_ENV,
  PORT: '8080',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://quizpeak:quizpeak@localhost:5433/quizpeak?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  SMS_DEV_MODE: 'true',
};

module.exports = {
  apps: [
    {
      name: 'api',
      cwd: ROOT,
      script: 'server/dist/main.js',
      interpreter: 'node',
      env: API_ENV,
      out_file: path.join(LOG_DIR, 'api-out.log'),
      error_file: path.join(LOG_DIR, 'api-err.log'),
      merge_logs: true,
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
    },
    {
      name: 'web',
      cwd: path.join(ROOT, 'web-pc'),
      script: path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'),
      args: 'start -p 3000',
      interpreter: 'node',
      env: { ...COMMON_ENV, PORT: '3000' },
      out_file: path.join(LOG_DIR, 'web-out.log'),
      error_file: path.join(LOG_DIR, 'web-err.log'),
      merge_logs: true,
      time: true,
      autorestart: true,
    },
    {
      name: 'admin',
      cwd: path.join(ROOT, 'admin'),
      script: path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'),
      args: 'start -p 3001',
      interpreter: 'node',
      env: { ...COMMON_ENV, PORT: '3001' },
      out_file: path.join(LOG_DIR, 'admin-out.log'),
      error_file: path.join(LOG_DIR, 'admin-err.log'),
      merge_logs: true,
      time: true,
      autorestart: true,
    },
  ],
};
