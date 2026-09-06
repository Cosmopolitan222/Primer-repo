import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7f4",
          100: "#d6ebe3",
          200: "#aed7c7",
          300: "#7fbfa9",
          400: "#4d9f87",
          500: "#2f8270",
          600: "#22685a",
          700: "#1d5449",
          800: "#19433b",
          900: "#153731",
        },
      },
    },
  },
  plugins: [],
};

export default config;
