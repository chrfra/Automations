import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    reporter: 'dot',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
