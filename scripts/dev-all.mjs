/**
 * 一键启动开发环境（watch / HMR，无需每次 build）
 * 用法: npm run dev:all
 *     npm run dev:all -- --no-admin   # 只起 api + web
 * 前提: 数据库已在运行（npm run db:local）
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { devEnv, stripSafeDeleteShim } from './lib/dev-env.mjs';

const args = process.argv.slice(2);
const only = args.filter((a) => a.startsWith('--')).map((a) => a.replace('--', ''));
const skip = (name) => only.includes(`no-${name}`);

const TASKS = [
  { name: 'api', color: '\x1b[36m', cmd: 'npm', args: ['run', 'start:dev', '-w', '@quizpeak/server'] },
  { name: 'web', color: '\x1b[32m', cmd: 'npm', args: ['run', 'dev', '-w', '@quizpeak/web-pc'] },
  { name: 'admin', color: '\x1b[35m', cmd: 'npm', args: ['run', 'dev', '-w', '@quizpeak/admin'] },
  { name: 'h5', color: '\x1b[33m', cmd: 'npm', args: ['run', 'dev', '-w', '@quizpeak/web-h5'] },
].filter((t) => !skip(t.name));

const RESET = '\x1b[0m';
const children = [];
// 统一剥离 safe-delete shim：Next/Vite 清理缓存不进回收站，也不会撞「单轮 500 文件」守卫
const env = devEnv();

// 刚跑过 npm run clean 时 server/dist 不存在，nest start --watch 有概率先跑 node 再编译导致
// MODULE_NOT_FOUND，这里先同步构建一次，保证一条命令就能起来。
if (TASKS.some((t) => t.name === 'api') && !existsSync('server/dist/main.js')) {
  console.log('检测到 server/dist 缺失（可能刚执行过 clean），先清增量缓存再构建 API…');
  // 增量构建缓存（.cache/ts-server.tsbuildinfo）比产物新时，tsc 会认为「无需输出」，
  // 导致 dist 目录是空的但编译报 0 errors。清掉缓存再构建最稳妥。
  rmSync('.cache/ts-server.tsbuildinfo', { force: true });
  const built = spawnSync('npm', ['run', 'build:server'], { stdio: 'inherit', shell: true, env });
  if (built.status !== 0) console.warn('API 预构建失败，watch 模式会继续尝试编译');
}

for (const task of TASKS) {
  const child = spawn(task.cmd, task.args, { shell: true, env });
  children.push(child);

  const pipe = (stream, isErr) => {
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const tag = `${task.color}[${task.name}]${RESET}`;
        (isErr ? process.stderr : process.stdout).write(`${tag} ${line}\n`);
      }
    });
  };
  pipe(child.stdout, false);
  pipe(child.stderr, true);

  child.on('exit', (code) => {
    process.stdout.write(`${task.color}[${task.name}]${RESET} 退出，代码 ${code}\n`);
  });
}

const stop = () => {
  for (const child of children) {
    try {
      child.kill();
    } catch {
      /* ignore */
    }
  }
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

console.log(`已启动: ${TASKS.map((t) => t.name).join(' / ')}（Ctrl+C 全部停止）`);
console.log('提示: 改代码后前端 HMR 自动更新、服务端 watch 自动重启，无需手动 build');
if (stripSafeDeleteShim(process.env.NODE_OPTIONS ?? '') !== (process.env.NODE_OPTIONS ?? '').trim()) {
  console.log('提示: 已为子进程剥离 safe-delete shim（缓存直接删除，不进回收站）');
}
