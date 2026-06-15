/**
 * DEPRECATED — Use `import { colors } from '../theme'` instead.
 * This file re-exports from the new theme system for backward compatibility.
 */
import colors from "../theme/colors";

// Legacy format: some screens use colors.text.primary, colors.status.success, etc.
// Map new flat structure to old nested structure for backward compatibility
const legacyColors = {
  ...colors,
  primary: colors.primary,
  trainer: colors.roles.trainer,
  referee: colors.roles.referee,
  background: colors.surface,

  text: {
    primary: colors.text,
    secondary: colors.textSub,
    muted: colors.textMuted,
    white: colors.textWhite,
    error: colors.error,
    success: colors.success,
    link: colors.textLink,
  },

  border: {
    light: colors.borderLight,
    medium: colors.border,
    dark: colors.borderDark,
  },

  status: {
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    pending: colors.secondary,
    inactive: colors.textMuted,
  },

  button: {
    primary: colors.buttonPrimary,
    secondary: colors.buttonSecondary,
    disabled: colors.buttonDisabled,
    text: colors.textWhite,
    disabledText: colors.buttonDisabledText,
  },

  input: {
    background: colors.inputBg,
    border: colors.inputBorder,
    placeholder: colors.placeholder,
    focused: colors.inputFocused,
  },

  gradient: {
    primary: colors.gradientPrimary,
    trainer: [colors.roles.trainer, "#A78BFA"],
    referee: [colors.roles.referee, "#34D399"],
  },

  social: colors.social,
};

export const themeByRole = {
  Player: { primary: colors.roles.player, gradient: colors.gradientPrimary },
  Trainer: { primary: colors.roles.trainer, gradient: [colors.roles.trainer, "#A78BFA"] },
  Referee: { primary: colors.roles.referee, gradient: [colors.roles.referee, "#34D399"] },
};

export default legacyColors;
