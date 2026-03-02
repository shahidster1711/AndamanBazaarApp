import type { Config } from "tailwindcss"

/**
 * Tailwind config for the Next.js shell.
 * Extends the same AndamanBazaar color tokens so the UI is cohesive.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
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
          100: "#ffe5df",
          200: "#ffcfc5",
          300: "#ffad9e",
          400: "#ff8a76",
          500: "#ff6b4a",
          600: "#f04830",
          700: "#cb3420",
          800: "#a82b1c",
          900: "#8c281d",
        },
        sandy: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#f5c842",
          500: "#eaaa15",
          600: "#c98a0e",
          700: "#a36a10",
          800: "#855415",
          900: "#6f4514",
        },
        warm: {
          50: "#fafaf7",
          100: "#f5f5f0",
          200: "#ecece4",
          300: "#d9d9cd",
        },
      },
    },
  },
  plugins: [],
}

export default config
