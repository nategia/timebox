/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const pair = (name) => ({ DEFAULT: token(name), foreground: token(`${name}-foreground`) });

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: token("background"),
        foreground: token("foreground"),
        border: token("border"),
        input: token("input"),
        ring: token("ring"),
        card: pair("card"),
        popover: pair("popover"),
        primary: pair("primary"),
        secondary: pair("secondary"),
        muted: pair("muted"),
        accent: pair("accent"),
        destructive: pair("destructive"),
        deep: token("kind-deep"),
        body: token("kind-body"),
        light: token("kind-light"),
        fixed: token("kind-fixed"),
      },
      fontFamily: {
        sans: "var(--font-sans)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: {
        gutter: "var(--space-gutter)",
        slot: "var(--slot-height)",
      },
    },
  },
  plugins: [],
};
