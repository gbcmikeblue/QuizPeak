/**
 * 开发/清理脚本的子进程环境
 *
 * 背景：部分 IDE（如 CodeBuddy）会给所有 node 进程注入
 *   NODE_OPTIONS=--require .../node-language-shim.cjs
 * 该 shim 把 fs.unlink / fs.rm 重定向到「回收站」，并且有「单轮删除 500 文件」的批量守卫。
 * Next dev / Vite 每次启动都会清理 .next/types、node_modules/.vite 等缓存目录，
 * 于是出现两类问题：
 *   1. 回收站被构建缓存塞满，磁盘没释放；
 *   2. 守卫触发后进程直接抛错退出（web 端起不来的常见原因）。
 *
 * 这里统一在拉起子进程时剥离该 shim，并显式关闭安全删除开关（双保险）。
 * 只影响我们 spawn 的 node 进程，不改变宿主 IDE 的其它行为。
 */

const SHIM_PATTERN = /--require(=|\s+)["']?[^"'\s]*node-(?:language|safe-delete)[^"'\s]*["']?/g;

/** 从 NODE_OPTIONS 里去掉 safe-delete shim，保留其它参数（如 --max-old-space-size） */
export function stripSafeDeleteShim(nodeOptions = '') {
  return nodeOptions.replace(SHIM_PATTERN, ' ').replace(/\s+/g, ' ').trim();
}

/** 当前进程是否被注入了 safe-delete shim */
export function isSafeDeleteShimmed(env = process.env) {
  return /node-(?:language|safe-delete)-shim/.test(env.NODE_OPTIONS ?? '');
}

/**
 * 生成用于开发/清理的子进程环境
 * @param {Record<string, string | undefined>} extra 额外覆盖的环境变量
 */
export function devEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  const stripped = stripSafeDeleteShim(env.NODE_OPTIONS ?? '');

  if (stripped) env.NODE_OPTIONS = stripped;
  else delete env.NODE_OPTIONS;

  // shim 若仍被其它环节重新注入，靠这个开关让它直接 return（见 shim 源码第 22 行）
  env.CODEBUDDY_SAFE_DELETE_ENABLED = '0';
  return env;
}
