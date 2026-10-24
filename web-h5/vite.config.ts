import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

/**
 * H5 开发说明：
 * - 端口 3002（PC 3000 / 后台 3001 之外）
 * - /api 反向代理到 NestJS，避免跨域；生产由 Nginx 同域转发
 */
export default defineConfig({
  plugins: [uni()],
  server: {
    host: true,
    port: 3002,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
