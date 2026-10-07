/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          900: '#0a0f1e',
          800: '#0f172a',
          750: '#131c35',
          700: '#1a2540',
          650: '#1e2d4d',
          600: '#243358',
          500: '#2d3f6e',
        },
      },
    },
  },
  plugins: [],
};
