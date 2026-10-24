/**
 * 单个开发服务启动器（统一处理子进程环境）
 *
 *   npm run dev:server   → NestJS watch
 *   npm run dev:web      → Next.js web-pc
 *   npm run dev:admin    → Next.js admin
 *   npm run dev:h5       → uni-app H5
 *
 * 为什么不直接在 package.json 里写 next dev：
 * 需要先剥离 IDE 注入的 safe-delete shim，否则 Next/Vite 清理缓存时会：
 *   - 把成千上万个缓存文件丢进回收站；
 *   - 触发「单轮删除 500 文件」守卫后直接退出（表现为 web 端起不来）。
 * 详见 scripts/lib/dev-env.mjs
 */
import { spawn } from 'node:child_process';
import { devEnv, stripSafeDeleteShim } from './lib/dev-env.mjs';

const SERVICES = {
  server: { color: '\x1b[36m', args: ['run', 'start:dev', '-w', '@quizpeak/server'] },
  web: { color: '\x1b[32m', args: ['run', 'dev', '-w', '@quizpeak/web-pc'] },
  admin: { color: '\x1b[35m', args: ['run', 'dev', '-w', '@quizpeak/admin'] },
  h5: { color: '\x1b[33m', args: ['run', 'dev', '-w', '@quizpeak/web-h5'] },
};

const name = process.argv[2];
const service = SERVICES[name];

if (!service) {
  console.error(`未知服务「${name ?? ''}」，可选：${Object.keys(SERVICES).join(' / ')}`);
  process.exit(1);
}

const rawNodeOptions = process.env.NODE_OPTIONS ?? '';
if (stripSafeDeleteShim(rawNodeOptions) !== rawNodeOptions.trim()) {
  console.log('提示: 已剥离 IDE 注入的 safe-delete shim（构建缓存直接删除，不进回收站）');
}

const child = spawn('npm', service.args, {
  shell: true,
  stdio: 'inherit',
  env: devEnv(),
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    child.kill(signal);
  });
}
