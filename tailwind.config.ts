import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        krong: {
          red: "#E31B23",
          saffron: "#D4AF37",
        },
        primary: {
          DEFAULT: "#E31B23",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#D4AF37",
          foreground: "#000000",
        },
      },
      fontFamily: {
        thai: ["Noto Sans Thai", "sans-serif"],
        sans: ["Inter", "Noto Sans Thai", "sans-serif"],
      },
      spacing: {
        'touch-sm': '44px',
        'touch-md': '48px',
        'touch-lg': '56px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;