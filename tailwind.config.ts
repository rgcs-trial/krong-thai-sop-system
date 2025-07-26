import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Restaurant Krong Thai Brand Colors
        "brand-red": "#E31B23",
        "brand-black": "#231F20", 
        "brand-white": "#FCFCFC",
        "brand-saffron": "#D4AF37",
        "brand-jade": "#008B8B", 
        "brand-beige": "#D2B48C",
        "krong-red": {
          DEFAULT: "#E31B23",
          50: "#FEF2F2",
          100: "#FEE2E2", 
          500: "#E31B23",
          600: "#DC2626",
          900: "#7F1D1D",
        },
        "krong-black": {
          DEFAULT: "#231F20",
          50: "#F6F6F6",
          500: "#6D6D6D",
          900: "#231F20",
        },
        "krong-white": {
          DEFAULT: "#FCFCFC",
        },
        "golden-saffron": {
          DEFAULT: "#D4AF37",
          500: "#D4AF37",
        },
        "jade-green": {
          DEFAULT: "#008B8B",
          500: "#008B8B",
        },
        "earthen-beige": {
          DEFAULT: "#D2B48C",
          500: "#D2B48C",
        },
        // shadcn/ui color system
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        // Restaurant Typography System
        heading: ["var(--font-eb-garamond)", "EB Garamond SC", "Trajan Pro 3", ...defaultTheme.fontFamily.serif],
        body: ["var(--font-source-serif-4)", "Source Serif 4", "Minion Pro", ...defaultTheme.fontFamily.serif],
        ui: ["var(--font-inter)", "Inter", ...defaultTheme.fontFamily.sans],
        thai: ["var(--font-noto-sans-thai)", "Noto Sans Thai", ...defaultTheme.fontFamily.sans],
        sans: ["var(--font-inter)", "Inter", ...defaultTheme.fontFamily.sans],
        serif: ["var(--font-source-serif-4)", "Source Serif 4", "Minion Pro", ...defaultTheme.fontFamily.serif],
      },
      fontSize: {
        // Tablet-optimized font sizes
        'tablet-sm': ['1rem', { lineHeight: '1.5rem' }],
        'tablet-base': ['1.125rem', { lineHeight: '1.75rem' }], 
        'tablet-lg': ['1.25rem', { lineHeight: '1.75rem' }],
        'tablet-xl': ['1.5rem', { lineHeight: '2rem' }],
        'tablet-2xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      spacing: {
        // Tablet-optimized touch targets
        "touch-sm": "44px",
        "touch-md": "48px", 
        "touch-lg": "56px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;