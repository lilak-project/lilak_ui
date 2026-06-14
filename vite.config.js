import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Demo gallery only. The package itself ships as source (no build step).
export default defineConfig({
  root: 'demo',
  plugins: [react()],
  optimizeDeps: {
    include: ['@phosphor-icons/react', 'react-markdown', 'remark-gfm'],
  },
})
