const config = {
  entry: ['src/main.tsx', 'public/theme-init.js'],
  project: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
  ignore: [
    'dist/**',
    'bindings/**',
    'coverage/**',
    'src/assets/**',
  ],
};

export default config;
