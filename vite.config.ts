import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:5000'

  return {
    plugins: [react()],
    server: {
      proxy: {
        // SSE 事件流（需要禁用缓冲，必须在 /api 之前匹配）
        '/api/events': {
          target: proxyTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              delete proxyRes.headers['content-length']
              proxyRes.headers['cache-control'] = 'no-cache'
              proxyRes.headers['x-accel-buffering'] = 'no'
            })
          },
        },
        // REST API
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        // Swagger UI（可选，方便开发时直接访问）
        '/swagger': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
