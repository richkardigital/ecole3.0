/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Using class strategy
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0f172a',        // slate-900: Background principal
          sidebar: '#0a0f1a',   // très sombre: Sidebar
          card: '#1e293b',      // slate-800: Cards
          accent: '#22c55e',    // green-500: Accent vert
          'accent-hover': '#16a34a',
          border: '#334155',    // slate-700: Borders subtils
          text: '#f8fafc',      // slate-50: Texte principal
          'text-muted': '#94a3b8', // slate-400: Texte secondaire
        }
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.3s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
