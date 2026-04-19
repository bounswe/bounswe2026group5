module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Brand primary aligned with web's dusty teal
        primary: {
          DEFAULT: "#4a7c6f",
          dim: "#6db0a2", // lighter variant used in dark mode
        },
        // Page / screen backgrounds
        surface: {
          DEFAULT: "#faf8f4",
          dark: "#14120e",
          input: "#f5f0e8", // form field fill (light)
          "input-dark": "#1e1c16", // form field fill (dark)
          card: "#ffffff",
          "card-dark": "#1a1710",
        },
        // Text colors
        "on-surface": {
          DEFAULT: "#1c1c18", // primary text (light)
          dark: "#f0ece4", // primary text (dark)
          soft: "#6b6456", // secondary text (light)
          "soft-dark": "#b8ad9a", // secondary text (dark)
          muted: "#8a8172", // placeholder / icon (light)
          "muted-dark": "#948a79", // placeholder / icon (dark)
        },
        // Active / selected state surface — used by pickers and list row highlights
        "surface-active": {
          DEFAULT: "#e8f2f0", // muted teal tint on warm background (light mode)
          dark: "#0f201e", // equivalent depth in dark mode
        },
        // Borders and dividers
        divider: {
          DEFAULT: "#ddd6c9",
          dark: "#353024",
        },
        // Error / destructive
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
        },
      },
    },
  },
  plugins: [],
};
