/**
 * Color System — Single source of truth for all colors
 *
 * Usage:
 *   import { colors } from '../theme';
 *   style={{ color: colors.text, backgroundColor: colors.surface }}
 */

const colors = {
  // Brand
  primary: "#004E93",
  primaryLight: "#E8F0FE",
  primaryDark: "#003A6E",
  secondary: "#FF6A00",
  secondaryLight: "#FFF0E5",
  secondaryDark: "#CC5500",

  // Status
  success: "#10B981",
  successLight: "#ECFDF5",
  warning: "#F59E0B",
  warningLight: "#FFFBEB",
  error: "#EF4444",
  errorLight: "#FEF2F2",
  info: "#3B82F6",
  infoLight: "#EFF6FF",

  // Surfaces
  surface: "#F5F7FA",
  card: "#FFFFFF",
  white: "#FFFFFF",
  black: "#000000",

  // Text
  text: "#1F2937",
  textSub: "#6B7280",
  textMuted: "#9CA3AF",
  textWhite: "#FFFFFF",
  textLink: "#004E93",

  // Borders
  border: "#E5E7EB",
  borderLight: "#F3F4F6",
  borderDark: "#D1D5DB",

  // Input
  inputBg: "#F9FAFB",
  inputBorder: "#E5E7EB",
  inputFocused: "#004E93",
  placeholder: "#9CA3AF",

  // Button
  buttonPrimary: "#004E93",
  buttonSecondary: "#FF6A00",
  buttonDisabled: "#E5E7EB",
  buttonDisabledText: "#9CA3AF",

  // Gradients (use with LinearGradient)
  gradientPrimary: ["#004E93", "#0071D2"],
  gradientSecondary: ["#FF6A00", "#FF8C38"],
  gradientSuccess: ["#10B981", "#34D399"],
  gradientDark: ["#1F2937", "#374151"],

  // Overlays
  overlay: "rgba(0,0,0,0.4)",
  overlayLight: "rgba(0,0,0,0.2)",
  overlayDark: "rgba(0,0,0,0.6)",

  // Role-specific accents
  roles: {
    player: "#004E93",
    trainer: "#7C3AED",
    referee: "#059669",
    manager: "#DC2626",
  },

  // Social
  social: {
    google: "#DB4437",
    facebook: "#4267B2",
  },
};

export default colors;
