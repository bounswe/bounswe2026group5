/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

const tintColorLight = "#4a7c6f";
const tintColorDark = "#88c4b8";

export const Colors = {
  light: {
    text: "#1c1c18",
    background: "#faf8f4",
    tint: tintColorLight,
    icon: "#6b6456",
    tabIconDefault: "#6b6456",
    tabIconSelected: tintColorLight,
    // Brand tokens tuned to match web's warm-neutral + dusty teal palette
    primary: "#4a7c6f",
    surfaceBase: "#faf8f4",
    inputBackground: "#f5f0e8",
    cardBackground: "#ffffff",
    surfaceActive: "#e8f2f0", // selected / active row background (light)
    textPrimary: "#1c1c18",
    textSoft: "#6b6456",
    textMuted: "#8a8172",
    divider: "#ddd6c9",
  },
  dark: {
    text: "#f0ece4",
    background: "#14120e",
    tint: tintColorDark,
    icon: "#b8ad9a",
    tabIconDefault: "#b8ad9a",
    tabIconSelected: tintColorDark,
    // Brand tokens tuned to match web dark palette
    primary: "#6db0a2",
    surfaceBase: "#14120e",
    inputBackground: "#1e1c16",
    cardBackground: "#1a1710",
    surfaceActive: "#0f201e", // selected / active row background (dark)
    textPrimary: "#f0ece4",
    textSoft: "#b8ad9a",
    textMuted: "#948a79",
    divider: "#353024",
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
