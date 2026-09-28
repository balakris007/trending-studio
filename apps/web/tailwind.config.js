/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        studio: {
          navy: '#0b1d3a',
          blue: '#1d4ed8',
          bright: '#2563eb',
          sky: '#38bdf8',
          orange: '#ea580c',
          pink: '#db2777',
          purple: '#7c3aed',
          dark: '#0f172a',
          card: '#1e293b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
