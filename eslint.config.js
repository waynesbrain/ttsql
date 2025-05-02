import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
    },
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    // plugins: {},
    rules: {
      "prefer-const": [
        "warn",
        {
          destructuring: "all",
        },
      ],
      // "@typescript-eslint/ban-types": [ // no longer working! rule not found
      //   "warn",
      //   {
      //     // See https://github.com/typescript-eslint/typescript-eslint/issues/2063#issuecomment-675156492
      //     extendDefaults: true,
      //     types: {
      //       "{}": false,
      //     },
      //   },
      // ],
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      // "@typescript-eslint/naming-convention": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-namespace": "off",
      // "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          /** Allow all unused args. */
          argsIgnorePattern: ".",
          /** Allow unused vars that start with an underscore. */
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // "@typescript-eslint/no-var-requires": "off",
      // "react-hooks/exhaustive-deps": "off",
      // "react-hooks/exhaustive-deps": [
      // //
      // // See the following issues
      // // - https://github.com/facebook/react/issues/29786
      // // - https://github.com/facebook/react/issues/14920#issuecomment-471070149
      // // - https://github.com/facebook/react/issues/16873
      // //
      //   "warn",
      //   {
      //     additionalHooks: "(useThing|useYada)",
      //   },
      // ],
      // // See https://github.com/ArnaudBarre/eslint-plugin-react-refresh
      // "react-refresh/only-export-components": [
      //   "warn",
      //   { allowConstantExport: true },
      // ],
    },
  },
);
