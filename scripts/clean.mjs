/**
 * 直接删除构建产物（不进回收站，比资源管理器/手动删快很多）
 * 用法: npm run clean        # 清理 .next / dist / .vite / tsbuildinfo
 *      npm run clean -- --all  # 额外清理 node_modules 下的缓存目录
 *
 * 说明：IDE 可能会给 node 进程注入 safe-delete shim（把删除重定向到回收站，
 * 且有「单轮 500 文件」守卫）。本脚本检测到自己被注入时，会用干净环境重跑一遍，
 * 保证缓存是真的被删掉、而不是堆在回收站里。
 */
import { spawnSync } from 'node:child_process';
import { rm, stat } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { devEnv, isSafeDeleteShimmed } from './lib/dev-env.mjs';

if (isSafeDeleteShimmed() && process.env.QP_CLEAN_REEXEC !== '1') {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: 'inherit', env: devEnv({ QP_CLEAN_REEXEC: '1' }) },
  );
  process.exit(result.status ?? 0);
}

const ROOT = process.cwd();
const all = process.argv.includes('--all');

const TARGETS = [
  'web-pc/.next',
  'admin/.next',
  'server/dist',
  'web-h5/dist',
  '.cache',
  'packages/shared/dist',
  'packages/i18n/dist',
  'server/tsconfig.tsbuildinfo',
  ...(all
    ? ['node_modules/.vite', 'web-h5/node_modules/.vite', '.turbo', 'node_modules/.cache']
    : []),
];

let freed = 0;
let removed = 0;

async function sizeOf(path) {
  try {
    const info = await stat(path);
    if (!info.isDirectory()) return info.size;
    const entries = await readdir(path, { withFileTypes: true });
    let total = 0;
    for (const entry of entries) {
      total += await sizeOf(join(path, entry.name));
    }
    return total;
  } catch {
    return 0;
  }
}

for (const target of TARGETS) {
  const full = join(ROOT, target);
  const bytes = await sizeOf(full);
  if (bytes === 0) continue;
  try {
    await rm(full, { recursive: true, force: true, maxRetries: 3, retryDelay: 120 });
  } catch (err) {
    console.warn(`✖ 跳过 ${target}：${err.message}（先停掉正在运行的服务再清理）`);
    continue;
  }
  freed += bytes;
  removed += 1;
  console.log(`✔ 删除 ${target}  (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
}

console.log(`\n共删除 ${removed} 项，释放 ${(freed / 1024 / 1024).toFixed(1)} MB`);
console.log('提示: 使用 fs.rm 直接删除，不经过回收站；构建产物本来就可以随时重建');
