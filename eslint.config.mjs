import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  // Configurações padrão do Next.js
  ...nextVitals,
  ...nextTs,
  
  // Prettier deve vir por ÚLTIMO para desabilitar regras conflitantes
  prettierConfig,
  
  // Pastas ignoradas
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "node_modules/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;