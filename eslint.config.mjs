import { defineConfig, globalIgnores } from 'eslint/config';
import nextPlugin from '@next/eslint-plugin-next';
import prettierConfig from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  // Configuração do Next.js
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },

  // Prettier deve vir por ÚLTIMO para desabilitar regras conflitantes
  prettierConfig,

  // Pastas ignoradas
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'node_modules/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
