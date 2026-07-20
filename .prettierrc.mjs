/** @type {import('prettier').Config} */
const config = {
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  // Sort Tailwind class names. Must run after other plugins → last in array.
  plugins: ['prettier-plugin-tailwindcss'],
  // Required for Tailwind v4: points the plugin at the CSS entry that
  // holds the `@theme` block (no tailwind.config.js in v4).
  tailwindStylesheet: './src/app/(frontend)/globals.css',
}

export default config
