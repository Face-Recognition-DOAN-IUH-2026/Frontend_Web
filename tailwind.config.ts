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
        bg: "#12151E",
        surface: {
          DEFAULT: "#1C2030",
          2: "#242838",
          3: "#2C3042",
        },
        primary: {
          DEFAULT: "#D4A853",
          dark: "#A88430",
          dim: "#8A6A28",
        },
        secondary: {
          DEFAULT: "#4A8C5C",
          dark: "#3D7350",
        },
        tertiary: "#5B9BD5",
        success: {
          DEFAULT: "#4A8C5C",
          bg: "#1A2E1F",
        },
        error: {
          DEFAULT: "#C44E4E",
          bg: "#2E1A1A",
        },
        warning: {
          DEFAULT: "#C49A3C",
          bg: "#2E2518",
        },
        info: {
          DEFAULT: "#5B9BD5",
          bg: "#1A2530",
        },
        text: {
          DEFAULT: "#EDE8DF",
          2: "#B8B0A4",
          3: "#7A7368",
        },
        border: {
          DEFAULT: "#2E3345",
          2: "#3A4052",
        },
      },
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
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
      animation: {
        "pulse-amber": "pulse-amber 2s ease-in-out infinite",
        "slide-in": "slide-in 200ms ease-out",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "success-pop": "success-pop 300ms ease-out",
        "fade-in": "fade-in 300ms ease-out",
        "fade-in-up": "fade-in-up 300ms ease-out",
      },
      keyframes: {
        "pulse-amber": {
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