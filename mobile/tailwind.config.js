module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Brand primary — blue from the design system
        primary: {
          DEFAULT: '#004ac6',
          dim: '#4a80e8', // lighter variant used in dark mode
        },
        // Page / screen backgrounds
        surface: {
          DEFAULT: '#f7f9fb',
          dark: '#0f1214',
          input: '#e6e8ea',      // form field fill (light)
          'input-dark': '#1e2530', // form field fill (dark)
          card: '#ffffff',
          'card-dark': '#141920',
        },
        // Text colors
        'on-surface': {
          DEFAULT: '#191c1e',     // primary text (light)
          dark: '#e2e8f0',        // primary text (dark)
          soft: '#434655',        // secondary text (light)
          'soft-dark': '#94a3b8', // secondary text (dark)
          muted: '#737686',       // placeholder / icon (light)
          'muted-dark': '#4a5568', // placeholder / icon (dark)
        },
        // Borders and dividers
        divider: {
          DEFAULT: '#c3c6d7',
          dark: '#2d3748',
        },
      },
    },
  },
  plugins: [],
};