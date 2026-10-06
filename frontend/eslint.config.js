import js from '@eslint/js'
import globals from 'globals'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'better-tailwindcss': betterTailwindcss,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      'better-tailwindcss': {
        entryPoint: './src/index.css',
      },
    },
    rules: {
      // Check class correctness without enforcing ordering or formatting.
      ...betterTailwindcss.configs.correctness.rules,
      'better-tailwindcss/no-unregistered-classes': ['error', {
        // Custom selectors declared directly in src/index.css.
        ignore: ['^font-width-(condensed|normal|expanded)$'],
      }],
      ...reactHooks.configs.recommended.rules,
      // Keep the existing typing backlog visible while correctness rules remain errors.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
)
