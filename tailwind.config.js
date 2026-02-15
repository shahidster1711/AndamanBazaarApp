
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
        primary: "#1a202c",
        secondary: "#2d3748",
        accent: "#ffb800",
        neutral: "#f7fafc",
        "base-100": "#ffffff",
      },
      fontSize: {
        sm: '0.8rem',
        base: '1rem',
        xl: '1.25rem',
        '2xl': '1.563rem',
        '3xl': '1.953rem',
        '4xl': '2.441rem',
        '5xl': '3.052rem',
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        mytheme: {
          primary: "#1a202c",
          secondary: "#2d3748",
          accent: "#ffb800",
          neutral: "#f7fafc",
          "base-100": "#ffffff",
        },
      },
    ],
  },
};