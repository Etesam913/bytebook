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
    server: {
      host: '127.0.0.1',
    },
    resolve: {
      // Ensure all wrappers/plugins share one CodeMirror module instance.
      dedupe: [
        '@codemirror/state',
        '@codemirror/view',
        '@codemirror/language',
        '@codemirror/autocomplete',
      ],
    },
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
        treeshake: {
          // @lexical/code declares sideEffects: true but is only reached
          // transitively via @lexical/markdown's CODE transformer (which
          // we don't use). Marking it and prismjs side-effect-free lets
          // the bundler drop most of it. We provide a tiny window.Prism
          // stub in index.html so @lexical/code's top-level IIFE doesn't
          // explode if any of its code survives shaking.
          moduleSideEffects: (id) => {
            if (id.includes('node_modules/@lexical/code/')) return false;
            if (id.includes('node_modules/prismjs')) return false;
            return true;
          },
        },
        output: {
          // This will help identify entry chunks vs lazy-loaded chunks
          entryFileNames: 'entry-[name].[hash].js',
          chunkFileNames: 'chunk-[name].[hash].js',
          // Group third-party deps into named vendor chunks to deduplicate
          // shared modules (motion, react-aria, etc.) that the auto-chunker
          // was placing into multiple route chunks. CM language packs and
          // vim mode return undefined so they keep their per-package lazy
          // chunks created by Phase 2's dynamic imports.
          manualChunks: (id) => {
            if (!id.includes('node_modules')) return undefined;
            if (
              id.match(
                /node_modules\/@codemirror\/lang-(python|go|java|javascript)\//
              )
            )
              return undefined;
            if (id.match(/node_modules\/@lezer\/(python|go|java|javascript)\//))
              return undefined;
            if (id.includes('node_modules/@replit/codemirror-vim/'))
              return undefined;
            if (id.match(/node_modules\/(react|react-dom|scheduler)\//))
              return 'vendor-react';
            if (id.match(/node_modules\/(lexical|@lexical)\//))
              return 'vendor-lexical';
            if (id.match(/node_modules\/(@codemirror|@lezer|@uiw)\//))
              return 'vendor-cm';
            if (
              id.match(
                /node_modules\/(@react-aria|@react-stately|react-aria-components|@floating-ui|tabbable)\//
              )
            )
              return 'vendor-aria';
            if (
              id.match(
                /node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//
              )
            )
              return 'vendor-motion';
            if (
              id.match(/node_modules\/(@tanstack|jotai|jotai-family|wouter)\//)
            )
              return 'vendor-state';
            if (id.includes('node_modules/react-virtuoso/'))
              return 'vendor-virtuoso';
            return 'vendor';
          },
        },
      },
    },
    define: {
      'process.env.IS_PREACT': JSON.stringify('false'),
    },
  };
});
