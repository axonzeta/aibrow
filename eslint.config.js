import eslint from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    plugins: {
      '@stylistic': stylistic
    },
    rules: {
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/spaced-comment': ['error', 'always'],
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/space-before-function-paren': ['error', 'always'],
      '@stylistic/indent': [
        'error',
        2,
        {
          ...stylistic.rules.indent.defaultOptions[1],
          offsetTernaryExpressions: false
        }
      ],
      '@stylistic/no-trailing-spaces': 'error',

      '@typescript-eslint/consistent-type-definitions': 0,
      '@typescript-eslint/no-require-imports': 0,
      '@typescript-eslint/no-unused-vars': ['error', {
        ignoreRestSiblings: true,
        caughtErrors: 'none',
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-empty-function': 0,
      '@typescript-eslint/no-explicit-any': 0,
      '@typescript-eslint/no-extraneous-class': 0,
      '@typescript-eslint/class-literal-property-style': 0,
      '@typescript-eslint/no-this-alias': 0,
      '@typescript-eslint/no-dynamic-delete': 0,
      '@typescript-eslint/prefer-for-of': 0,
      '@typescript-eslint/no-unused-expressions': ['error', { allowTernary: true }],

      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-private-class-members': 0
    },
    languageOptions: {
      ecmaVersion: 'latest',
      globals: { }
    }
  },
  {
    ignores: [
      'node_modules/*',
      'out/*'
    ]
  },

  // Config & build files
  {
    files: [
      '**/webpack.config.js',
      '**/types-rollup.config.js'
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.node
      }
    }
  },

  // Native binaries
  {
    files: [
      'src/native/boot/**/*.cjs',
      'src/native/main/**/*.js'
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.node
      }
    }
  },

  // Extensions
  {
    files: [
      'src/extension/**/*.js',
      'src/extension-library/**/*.js'
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.webextensions
      }
    }
  },

  // Web
  {
    files: [
      'src/web-library/**/*.js'
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser
      }
    }
  }
)
