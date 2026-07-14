/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#bad2ff",
          300: "#8bb4ff",
          400: "#568dff",
          500: "#2f66fa",
          600: "#1c46e0",
          700: "#1836b3",
          800: "#182f8d",
          900: "#182c70",
          950: "#101a45",
        },
        accent: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 2px 8px -2px rgb(15 23 42 / 0.06)",
        elevated: "0 4px 16px -4px rgb(15 23 42 / 0.10), 0 2px 6px -2px rgb(15 23 42 / 0.06)",
        "elevated-dark": "0 4px 20px -4px rgb(0 0 0 / 0.4), 0 2px 8px -2px rgb(0 0 0 / 0.3)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
