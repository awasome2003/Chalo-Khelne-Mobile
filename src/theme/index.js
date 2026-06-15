/**
 * Theme System — Single import for the entire design system
 *
 * Usage:
 *   import { colors, typography, spacing, radius, shadows, layout } from '../theme';
 *
 *   // Or import the full theme object:
 *   import { theme } from '../theme';
 *   theme.colors.primary
 *   theme.spacing.lg
 */

import colors from "./colors";
import typography, { fontSize, fontWeight } from "./typography";
import spacing, { radius, layout } from "./spacing";
import shadows from "./shadows";

export { colors, typography, fontSize, fontWeight, spacing, radius, layout, shadows };

const theme = {
  colors,
  typography,
  fontSize,
  fontWeight,
  spacing,
  radius,
  layout,
  shadows,
};

export default theme;
