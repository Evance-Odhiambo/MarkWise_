/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      screens: {
        xs: '360px',
        sm: '360px',
        md: '480px',
        lg: '768px',
        xl: '1024px',
        '2xl': '1280px',
      },
    },
  },
  plugins: [],
};
