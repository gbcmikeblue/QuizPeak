#!/usr/bin/env node
/**
 * 本地开发数据库（无需 Docker / Podman）
 * 启动一个嵌入式 PostgreSQL，数据持久化在 .dev/pgdata。
 *
 *   npm run db:local            # 默认端口 5433，库 quizpeak
 *   DEV_PG_PORT=5544 npm run db:local
 *
 * 首次运行会将 PostgreSQL 二进制下载到缓存目录（约 30-50MB），之后离线可用。
 * 装了 Podman 之后可改用：podman compose up -d postgres redis
 */
import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs';
import EmbeddedPostgres from 'embedded-postgres';

const PORT = Number(process.env.DEV_PG_PORT ?? 5433);
const USER = process.env.DEV_PG_USER ?? 'quizpeak';
const PASSWORD = process.env.DEV_PG_PASSWORD ?? 'quizpeak';
const DB = process.env.DEV_PG_DATABASE ?? 'quizpeak';
const dataDir = path.resolve('.dev/pgdata');

const databaseUrl = `postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DB}?schema=public`;

fs.mkdirSync(path.dirname(dataDir), { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
});

let started = false;

async function shutdown(signal) {
  if (!started) process.exit(0);
  console.log(`\n[dev-db] 收到 ${signal}，正在停止数据库…`);
  try {
    await pg.stop();
  } catch (err) {
    console.error('[dev-db] 停止失败：', err.message);
  }
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  try {
    await pg.initialise();
  } catch (err) {
    // 数据目录已存在时 initialise 会抛错，属正常情况
    if (!/already exists|initdb/i.test(err.message)) throw err;
  }

  await pg.start();
  started = true;

  try {
    await pg.createDatabase(DB);
  } catch (err) {
    if (!/already exists/i.test(err.message)) {
      console.warn(`[dev-db] createDatabase 跳过：${err.message}`);
    }
  }

  console.log('\n[dev-db] PostgreSQL 已就绪');
  console.log(`[dev-db] DATABASE_URL=${databaseUrl}`);
  console.log('[dev-db] server/.env 里填上面这行即可，Ctrl+C 停止\n');
} catch (err) {
  console.error('[dev-db] 启动失败：', err);
  process.exit(1);
}
