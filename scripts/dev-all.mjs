/**
 * 一键启动开发环境（watch / HMR，无需每次 build）
 * 用法: npm run dev:all
 *     npm run dev:all -- --no-admin   # 只起 api + web
 * 前提: 数据库已在运行（npm run db:local）
 */
import { spawn } from 'node:child_process';

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

for (const task of TASKS) {
  const child = spawn(task.cmd, task.args, { shell: true, env: process.env });
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
