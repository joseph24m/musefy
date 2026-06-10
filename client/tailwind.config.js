/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0A',
        surface: '#121212',
        'surface-2': '#1C1C1E',
        accent: '#1DB954',
        'accent-alt': '#FF2D55',
        'text-pri': '#FFFFFF',
        'text-sec': '#A8A8A8',
        'text-ter': '#535353',
        border: 'rgba(255,255,255,0.08)',
      },
      fontFamily: {
        sans: ['-apple-system', 'SF Pro Display', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
