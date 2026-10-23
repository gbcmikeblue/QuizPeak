/**
 * 直接删除构建产物（不进回收站，比资源管理器/手动删快很多）
 * 用法: npm run clean        # 清理 .next / dist / .cache / tsbuildinfo
 *      npm run clean -- --all  # 同时清理 node_modules 缓存目录
 */
import { rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const all = process.argv.includes('--all');

const TARGETS = [
  'web-pc/.next',
  'admin/.next',
  'server/dist',
  '.cache',
  'packages/shared/dist',
  'packages/i18n/dist',
  'server/tsconfig.tsbuildinfo',
  ...(all ? ['web-pc/.next/cache', 'admin/.next/cache'] : []),
];

let freed = 0;
let removed = 0;

async function sizeOf(path) {
  try {
    const info = await stat(path);
    if (!info.isDirectory()) return info.size;
    const { readdir } = await import('node:fs/promises');
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
  await rm(full, { recursive: true, force: true, maxRetries: 3 });
  freed += bytes;
  removed += 1;
  console.log(`✔ 删除 ${target}  (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
}

console.log(`\n共删除 ${removed} 项，释放 ${(freed / 1024 / 1024).toFixed(1)} MB`);
console.log('提示: 使用 fs.rm 直接删除，不经过回收站；构建产物本来就可以随时重建');
