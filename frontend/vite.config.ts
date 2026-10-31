import react from '@vitejs/plugin-react';
import reactCompiler from 'babel-plugin-react-compiler';
import { defineConfig, loadEnv, minify, type PluginOption } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import wailsTypedEvents from '@wailsio/runtime/plugins/vite';
import path from 'node:path';

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
          filename: 'dist/bundle-analysis.html',
          gzipSize: true,
          brotliSize: true,
          template: 'treemap',
        }) as PluginOption,
      ]
    : [];

  let themeTarget: string | string[] | undefined;

  return {
    experimental: {
      // Reduce module requests across parallel browser pages only during E2E.
      bundledDev: mode === 'e2e',
    },
    server: {
      host: '127.0.0.1',
      // E2E does not edit source. Avoid refresh wrappers running before the
      // preamble in shared bundled chunks; keep HMR for ordinary development.
      hmr: mode === 'e2e' ? false : undefined,
    },
    optimizeDeps: {
      // The React Compiler injects this import after Vite's initial scan.
      include: ['react/compiler-runtime'],
    },
    resolve: {
      alias: {
        // The only server API used is renderToStaticMarkup. React's browser
        // barrel also requires the unused streaming renderer through CJS.
        ...(mode === 'production'
          ? {
              'react-dom/server': path.resolve(
                import.meta.dirname,
                'node_modules/react-dom/cjs/react-dom-server-legacy.browser.production.js'
              ),
            }
          : {}),
        '@bindings': path.resolve(
          import.meta.dirname,
          './bindings/github.com/etesam913/bytebook/internal'
        ),
        '@components': path.resolve(import.meta.dirname, './src/components'),
        '@hooks': path.resolve(import.meta.dirname, './src/hooks'),
        '@utils': path.resolve(import.meta.dirname, './src/utils'),
        '@': path.resolve(import.meta.dirname, './src'),
      },
      // Ensure all wrappers/plugins share one CodeMirror module instance.
      dedupe: [
        '@codemirror/state',
        '@codemirror/view',
        '@codemirror/language',
        '@codemirror/autocomplete',
        '@lezer/common',
      ],
    },
    plugins: [
      {
        name: 'minify-theme-bootstrap',
        apply: 'build',
        configResolved(config) {
          themeTarget = config.build.target || undefined;
        },
        async writeBundle(options) {
          // Public files bypass Vite's minifier. Keep the theme bootstrap a
          // blocking classic script so it still runs before the first paint.
          const file = path.resolve(options.dir!, 'theme-init.js');
          const result = await minify(
            'theme-init.js',
            await readFile(file, 'utf8'),
            {
              compress: { target: themeTarget },
              mangle: true,
            }
          );
          if (result.errors.length)
            throw new Error('Theme bootstrap minification failed');
          await writeFile(file, result.code);
        },
      },
      react({
        babel: {
          plugins: [[reactCompiler, ReactCompilerConfig]],
        },
      }),
      // Injects the generated eventcreate glue into the runtime so event data
      // arrives as the typed model classes declared in bindings/.../eventdata.d.ts.
      wailsTypedEvents(path.resolve(import.meta.dirname, './bindings')),
      ...visualizerPlugin,
      tailwindcss(),
    ],
    build: {
      rolldownOptions: {
        output: {
          topLevelVar: false,
          // This will help identify entry chunks vs lazy-loaded chunks
          entryFileNames: 'entry-[name].[hash].js',
          chunkFileNames: 'chunk-[name].[hash].js',
        },
      },
    },
  };
});
