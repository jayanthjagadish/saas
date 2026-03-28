import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'build'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
      ],
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    setupFiles: ['tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './packages/shared/src'),
      '@api': path.resolve(__dirname, './packages/api/src'),
      '@web': path.resolve(__dirname, './packages/web/src'),
    },
  },
});
