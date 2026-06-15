/**
 * Typography System — Consistent text styles across the app
 *
 * Usage:
 *   import { typography } from '../theme';
 *   style={typography.heading}
 *   style={[typography.body, { color: colors.textSub }]}
 */

// Individual scales (for mixing manually)
export const fontSize = {
  tiny: 10,
  caption: 12,
  body: 14,
  subtitle: 16,
  title: 20,
  heading: 28,
};

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
};

// Pre-composed text styles (ready to use)
const typography = {
  heading: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.extrabold,
    lineHeight: 34,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semibold,
    lineHeight: 22,
  },
  body: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.regular,
    lineHeight: 20,
  },
  caption: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    lineHeight: 16,
  },
  tiny: {
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.semibold,
    lineHeight: 14,
  },
  // Variants
  bodyBold: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    lineHeight: 20,
  },
  captionBold: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    lineHeight: 16,
  },
  label: {
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.bold,
    lineHeight: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
};

export default typography;
