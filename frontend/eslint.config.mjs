import nextPlugin from "@next/eslint-plugin-next";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "test-results/**",
      "playwright-report/**",
      "coverage/**",
      "dist/**",
      "out/**",
      "*.tsbuildinfo",
      "next-env.d.ts",
    ],
  },
  nextPlugin.configs["core-web-vitals"],
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-page-custom-font": "off",
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
