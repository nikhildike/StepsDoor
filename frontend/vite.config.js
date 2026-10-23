import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    // jsdom simulates a browser DOM so component tests can render without a real browser.
    environment: 'jsdom',
    // Exposes describe/it/expect as globals — required so setupTests.js can call
    // the global `expect.extend()` that jest-dom's matchers hook into.
    globals: true,
    // Registers jest-dom matchers (toBeInTheDocument, etc.) for every test file.
    setupFiles: './src/setupTests.js',
  },
})
