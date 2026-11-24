import { defineConfig, globalIgnores } from 'eslint/config';
import nextConfig from 'eslint-config-next';

export default defineConfig([
  ...nextConfig,
  {
    rules: {
      // Existing loading and preview effects update React state while syncing with external data.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);
