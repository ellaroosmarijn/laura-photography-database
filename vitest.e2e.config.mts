import { defineConfig, mergeConfig } from 'vitest/config';
import vitestConfig from './vitest.config.mjs';

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      fileParallelism: false,
      include: ['**/*.e2e-{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      environmentMatchGlobs: [['src/**', 'prisma']],
    },
  }),
);
