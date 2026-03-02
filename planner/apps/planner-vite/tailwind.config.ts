import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#0d9e8a",
          600: "#0d6e8e",
          700: "#0e5a74",
          800: "#134e62",
          900: "#144356",
          950: "#092a38",
        },
        coral: {
          50: "#fff4f2",
          500: "#ff6b4a",
          600: "#f04830",
        },
        sandy: {
          50: "#fffbeb",
          100: "#fef3c7",
          400: "#f5c842",
          700: "#a36a10",
          800: "#855415",
          900: "#6f4514",
        },
        warm: {
          50: "#fafaf7",
          100: "#f5f5f0",
        },
      },
    },
  },
  plugins: [],
}

export default config
