import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      // `server-only` throws outside a React Server Component. Stub it so
      // server-side modules (admin-orders, site-info) are importable in tests.
      'server-only': path.resolve(import.meta.dirname, 'src/test/server-only-stub.ts'),
      '@': path.resolve(import.meta.dirname, 'src'),
      '@emails': path.resolve(import.meta.dirname, 'emails'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Only files a test actually imports. Reporting on every untested file
      // turns the number into noise while the suite is still growing.
      include: ['src/lib/**', 'src/app/api/**'],
      exclude: ['**/*.test.ts', 'src/test/**', '**/*.d.ts'],
      reporter: ['text', 'html'],
    },
  },
})
