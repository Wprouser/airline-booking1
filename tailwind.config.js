/** @type {import('tailwindcss').Config} */
export default {
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
        },
      },
    },
  },
  plugins: [],
};
