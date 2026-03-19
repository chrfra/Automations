import { defineConfig } from 'tsup'
import { resolve } from 'node:path'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  bundle: true,
  sourcemap: true,
  clean: true,
  esbuildOptions(options) {
    options.alias = {
      '@': resolve('./src'),
    }
  },
})
