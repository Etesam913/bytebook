import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { configDefaults } from 'vitest/config';

const ReactCompilerConfig = {
  // Your react-compiler options here
  target: '19',
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const SHOULD_ANALYZE = env.VITE_ANALYZE === 'true';
  const visualizerPlugin = SHOULD_ANALYZE
    ? [
        visualizer({
          open: true,
          filename: 'bundle-analysis.html',
          gzipSize: true,
          brotliSize: true,
          template: 'treemap',
        }),
      ]
    : [];

  return {
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler', ReactCompilerConfig]],
        },
      }),
      ...visualizerPlugin,
      tailwindcss(),
    ],
    build: {
      rolldownOptions: {
        output: {
          // This will help identify entry chunks vs lazy-loaded chunks
          entryFileNames: 'entry-[name].[hash].js',
          chunkFileNames: 'chunk-[name].[hash].js',
        },
      },
    },
    define: {
      'process.env.IS_PREACT': JSON.stringify('false'),
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    },
  };
});
