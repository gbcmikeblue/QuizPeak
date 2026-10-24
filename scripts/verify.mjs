/**
 * 快速探活：一次检查端口与关键接口，替代手工重启 + 长时间等待
 * 用法: npm run verify
 */
const TARGETS = [
  { name: 'db', url: null, port: 5433 },
  { name: 'api', url: 'http://localhost:8080/api/health' },
  { name: 'web', url: 'http://localhost:3000/' },
  { name: 'admin', url: 'http://localhost:3001/login' },
  { name: 'h5', url: 'http://localhost:3002/' },
];

async function checkPort(port) {
  const net = await import('node:net');
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(800, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

const started = Date.now();

for (const target of TARGETS) {
  if (target.port) {
    const ok = await checkPort(target.port);
    console.log(`${ok ? '✔' : '✖'} db    :5433 ${ok ? 'listening' : 'DOWN'}`);
    continue;
  }
  const t0 = Date.now();
  try {
    const res = await fetch(target.url, { signal: AbortSignal.timeout(4000) });
    console.log(`${res.ok ? '✔' : '✖'} ${target.name.padEnd(5)} ${res.status}  ${Date.now() - t0}ms  ${target.url}`);
  } catch (error) {
    console.log(`✖ ${target.name.padEnd(5)} DOWN      ${target.url}  (${error.message})`);
  }
}

console.log(`\n耗时 ${Date.now() - started}ms`);
