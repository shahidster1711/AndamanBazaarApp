/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./App.tsx",
    "./views/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9', // Primary Brand Color
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        coral: {
          50: '#fff1f2',
          500: '#f43f5e', // Accent
        },
        teal: {
          500: '#14b8a6', // Success/Safe
        },
        // Legacy support (mapping to new palette)
        primary: "#0f172a",
        secondary: "#334155",
        accent: "#f43f5e",
        neutral: "#f8fafc",
        "base-100": "#ffffff",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
      },
      backgroundImage: {
        'tropical-gradient': 'linear-gradient(135deg, #0ea5e9 0%, #0d9488 100%)',
        'sunset-gradient': 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)',
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light"], // Enforce light theme for now to ensure consistency
  },
};