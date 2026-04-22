/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./views/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx"
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          DEFAULT: '#00d992',
          50: '#e6fff4',
          100: '#ccffea',
          200: '#99ffd5',
          300: '#66ffbf',
          400: '#33ffaa',
          500: '#00d992',
          600: '#00b37a',
          700: '#008c62',
          800: '#00664a',
          900: '#004031',
          950: '#001a14',
        },
        mint: '#2fd6a1',
        abyss: '#050507',
        carbon: '#101010',
        warm: '#3d3a39',
        snow: '#f2f2f2',
        parchment: '#b8b3b0',
        slate: {
          500: '#8b949e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        heading: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Ubuntu', 'Cantarell', 'Noto Sans', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      borderRadius: {
        'premium': '8px',
        'pill': '9999px'
      },
      boxShadow: {
        'glow': '0 0 15px rgba(0, 217, 146, 0.1)',
        'elevation-low': 'rgba(92, 88, 85, 0.2) 0px 0px 15px',
        'elevation-high': 'rgba(0, 0, 0, 0.7) 0px 20px 60px',
      }
    }
  },
  plugins: [],
}