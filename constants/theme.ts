/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#2f6f4f';
const tintColorDark = '#8ecf9f';

export const Colors = {
  light: {
    text: '#173227',
    background: '#eef1eb',
    tint: tintColorLight,
    icon: '#6d7569',
    tabIconDefault: '#6d7569',
    tabIconSelected: tintColorLight,
    surface: '#f8f8f3',
    surfaceStrong: '#e3e8de',
    border: '#d4dacd',
    muted: '#5f6d63',
    success: '#2f6f4f',
    warning: '#d4a23a',
    danger: '#c4563f',
    soil: '#8c6445',
    terrainLine: '#c6d0bf',
  },
  dark: {
    text: '#edf3eb',
    background: '#142019',
    tint: tintColorDark,
    icon: '#95a395',
    tabIconDefault: '#95a395',
    tabIconSelected: tintColorDark,
    surface: '#1d2c23',
    surfaceStrong: '#24362b',
    border: '#314438',
    muted: '#a6b4aa',
    success: '#8ecf9f',
    warning: '#f0c15b',
    danger: '#ef7d66',
    soil: '#b2835f',
    terrainLine: '#2c3a31',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
