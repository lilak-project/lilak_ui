import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Demo gallery only. The package itself ships as source (no build step).
// The demo port comes from the environment (PORT) with a default, so it can be
// overridden via .env.local or `PORT=5121 npm run demo`. See .env.example.
export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }
  return {
    root: 'demo',
    envDir: process.cwd(),   // read .env files from the package root, not demo/
    plugins: [react()],
    optimizeDeps: {
      include: ['@phosphor-icons/react', 'react-markdown', 'remark-gfm'],
    },
    server: { port: Number(env.PORT) || 5120 },
  }
})
