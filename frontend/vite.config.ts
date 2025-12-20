import react from '@vitejs/plugin-react';
import reactCompiler from 'babel-plugin-react-compiler';
import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

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
          plugins: [[reactCompiler, ReactCompilerConfig]],
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
  };
});
