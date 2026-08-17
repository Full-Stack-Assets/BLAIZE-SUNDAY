import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // BLAIZE Sunday / Songforge dark luxury glitch palette
        void: "#050505",
        ink: "#0a0a0a",
        slate: {
          950: "#0c0c0e",
          900: "#121214",
          800: "#1a1a1e",
          700: "#242428",
          600: "#2e2e34",
        },
        bone: "#e8e4df",
        ash: "#a8a29e",
        accent: {
          DEFAULT: "#c4a35a", // muted gold
          soft: "#d4b87a",
          dim: "#8a7340",
        },
        glitch: {
          cyan: "#00f5d4",
          magenta: "#f72585",
          red: "#ff2d55",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tighter: "-0.04em",
        tight: "-0.02em",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
