/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f2faf1',
          100: '#e0f2dc',
          200: '#bde3b7',
          300: '#90cd88',
          400: '#63b25c',
          500: '#3f9a3d',
          600: '#2d7c2f',
          700: '#256229',
          800: '#204f25',
          900: '#1c4121',
        },
        accent: {
          500: '#d97706',
          600: '#b45309',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
