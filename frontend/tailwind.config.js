import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // The Bengali font only covers Bangla characters (unicode-range), so English
        // text still uses the system font.
        sans: ['"Noto Sans Bengali"', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};
