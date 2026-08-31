import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/_components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/(dashboard)/_components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/(kiosk)/*/_components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/library/*/_components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/login/_components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/register/_components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          2: "rgb(var(--color-surface-2) / <alpha-value>)",
          3: "rgb(var(--color-surface-3) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          dark: "rgb(var(--color-primary-dark) / <alpha-value>)",
          dim: "rgb(var(--color-primary-dim) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--color-secondary) / <alpha-value>)",
          dark: "rgb(var(--color-secondary-dark) / <alpha-value>)",
        },
        tertiary: "rgb(var(--color-tertiary) / <alpha-value>)",
        success: {
          DEFAULT: "rgb(var(--color-success) / <alpha-value>)",
          bg: "rgb(var(--color-success-bg) / <alpha-value>)",
        },
        error: {
          DEFAULT: "rgb(var(--color-error) / <alpha-value>)",
          bg: "rgb(var(--color-error-bg) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "rgb(var(--color-warning) / <alpha-value>)",
          bg: "rgb(var(--color-warning-bg) / <alpha-value>)",
        },
        info: {
          DEFAULT: "rgb(var(--color-info) / <alpha-value>)",
          bg: "rgb(var(--color-info-bg) / <alpha-value>)",
        },
        text: {
          DEFAULT: "rgb(var(--color-text) / <alpha-value>)",
          2: "rgb(var(--color-text-2) / <alpha-value>)",
          3: "rgb(var(--color-text-3) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--color-border) / <alpha-value>)",
          2: "rgb(var(--color-border-2) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        serif: ["Playfair Display", "serif"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(212, 168, 83, 0.3)",
        "glow-sm": "0 0 10px rgba(212, 168, 83, 0.2)",
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      transitionTimingFunction: {
        "smooth-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        "spring-snappy": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "sheet": "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      transitionDuration: {
        "180": "180ms",
        "280": "280ms",
        "350": "350ms",
      },
      animation: {
        "pulse-blue": "pulse-blue 2s ease-in-out infinite",
        "slide-in": "slide-in 200ms ease-out",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "success-pop": "success-pop 300ms ease-out",
        "fade-in": "fade-in 300ms ease-out",
        "fade-in-up": "fade-in-up 300ms ease-out",
      },
      keyframes: {
        "pulse-blue": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(1.3)" },
        },
        "slide-in": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
        "success-pop": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "70%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
