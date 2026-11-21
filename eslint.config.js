import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["build", ".react-router", ".wrangler", ".claude", "node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx,js}"],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    // R3F scenes mutate three.js objects (geometry, materials, shared state refs) inside useFrame by design; the
    // React Compiler immutability rule assumes render-time React values and flags every frame update.
    files: ["app/scene/**/*.tsx"],
    rules: { "react-hooks/immutability": "off" },
  },
);
