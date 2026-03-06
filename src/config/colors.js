// Main app colors
const colors = {
  // Primary brand colors
  primary: "#f4511e", // Player color theme
  trainer: "#2196F3", // Trainer color theme
  referee: "#4CAF50", // Referee color theme

  // Common UI colors
  white: "#ffffff",
  black: "#000000",
  background: "#f8f8f8",
  card: "#ffffff",

  // Text colors
  text: {
    primary: "#333333",
    secondary: "#666666",
    muted: "#999999",
    white: "#ffffff",
    error: "#f44336",
    success: "#4CAF50",
    link: "#2196F3",
  },

  // Border colors
  border: {
    light: "#eeeeee",
    medium: "#dddddd",
    dark: "#bbbbbb",
  },

  // Status colors
  status: {
    success: "#4CAF50", // Green
    warning: "#FFC107", // Amber
    error: "#f44336", // Red
    info: "#2196F3", // Blue
    pending: "#FF9800", // Orange
    inactive: "#9E9E9E", // Grey
  },

  // Background shades (low opacity colors for badges, cards, etc.)
  background: {
    success: "rgba(76, 175, 80, 0.1)",
    warning: "rgba(255, 193, 7, 0.1)",
    error: "rgba(244, 67, 54, 0.1)",
    info: "rgba(33, 150, 243, 0.1)",
    pending: "rgba(255, 152, 0, 0.1)",
    inactive: "rgba(158, 158, 158, 0.1)",
  },

  // Social media colors
  social: {
    google: "#DB4437",
    facebook: "#4267B2",
    twitter: "#1DA1F2",
  },

  // Input field colors
  input: {
    background: "#f9f9f9",
    border: "#dddddd",
    placeholder: "#999999",
    focused: "#f4511e",
  },

  // Button colors
  button: {
    primary: "#f4511e",
    secondary: "#757575",
    disabled: "#e0e0e0",
    text: "#ffffff",
    disabledText: "#9E9E9E",
  },

  // Gradient colors
  gradient: {
    primary: ["#f4511e", "#ff7043"],
    trainer: ["#2196F3", "#64B5F6"],
    referee: ["#4CAF50", "#81C784"],
  },
};

// Role-based theme mapping
export const themeByRole = {
  Player: {
    primary: colors.primary,
    gradient: colors.gradient.primary,
  },
  Trainer: {
    primary: colors.trainer,
    gradient: colors.gradient.trainer,
  },
  Referee: {
    primary: colors.referee,
    gradient: colors.gradient.referee,
  },
};

export default colors;
