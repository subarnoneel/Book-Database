import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep library green, used for primary actions and highlights.
        brand: {
          50: "#eef6f3",
          100: "#d5e9e2",
          200: "#aed3c6",
          300: "#7fb6a4",
          400: "#529781",
          500: "#357b66",
          600: "#286352",
          700: "#224f43",
          800: "#1d4037",
          900: "#18342e",
        },
        // Warm paper tones for backgrounds and surfaces.
        paper: {
          DEFAULT: "#faf8f4",
          dark: "#f2eee6",
          line: "#e6e0d4",
        },
        ink: {
          DEFAULT: "#1f2421",
          soft: "#4b534e",
          muted: "#7a817c",
        },
      },
      fontFamily: {
        // Bengali fonts only cover Bangla characters (unicode-range), so they can go
        // first without affecting English text.
        sans: ['"Noto Sans Bengali"', "Inter", ...defaultTheme.fontFamily.sans],
        serif: ['"Noto Serif Bengali"', "Lora", ...defaultTheme.fontFamily.serif],
      },
      boxShadow: {
        card: "0 1px 2px rgb(31 36 33 / 0.06), 0 1px 3px rgb(31 36 33 / 0.08)",
        lift: "0 10px 25px -8px rgb(31 36 33 / 0.25)",
      },
      keyframes: {
        "fade-in": { from: { opacity: 0, transform: "translateY(4px)" }, to: { opacity: 1, transform: "none" } },
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out",
      },
    },
  },
  plugins: [],
};
