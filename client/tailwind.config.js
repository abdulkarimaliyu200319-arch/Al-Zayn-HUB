/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1E6FFF',
        accent: '#F5C518',
        dark: '#0A1628',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(30, 111, 255, 0.35)',
        glowGold: '0 0 24px rgba(245, 197, 24, 0.35)',
      },
    },
  },
  plugins: [],
};
