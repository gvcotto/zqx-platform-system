import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const baseDirectory = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory });

const config = [
  { ignores: [".next/**", "coverage/**", "node_modules/**", "*.tsbuildinfo"] },
  ...compat.extends("next/core-web-vitals"),
  { rules: { "@next/next/no-img-element": "off" } },
];

export default config;
