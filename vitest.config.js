import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Minimal config so `vitest` can transform the kit's JSX. jsdom gives the kit's
// components a DOM (a few reach for document/window at render), matching how a
// consumer app runs them.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
  },
})
