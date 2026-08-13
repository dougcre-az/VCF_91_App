/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  // JIT: only class names found in these files are emitted into the production CSS.
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
