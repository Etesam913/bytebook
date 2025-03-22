import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

const ReactCompilerConfig = {
  // Your react-compiler options here
  target: '19',
};

export default defineConfig(() => ({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', ReactCompilerConfig]],
      },
    }),
    tailwindcss(),
    visualizer({
      open: true,
      filename: 'bundle-analysis.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
  ],
  build: {
    rollupOptions: {
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
}));
