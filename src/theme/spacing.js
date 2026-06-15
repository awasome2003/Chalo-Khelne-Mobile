/**
 * Spacing & Layout System — 4px base grid
 *
 * Usage:
 *   import { spacing, radius } from '../theme';
 *   style={{ padding: spacing.lg, borderRadius: radius.md }}
 */

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

// Common layout patterns
export const layout = {
  screenPadding: spacing.lg, // 16px horizontal padding on all screens
  cardPadding: spacing.lg, // 16px inside cards
  sectionGap: spacing.xxl, // 24px between major sections
  listItemGap: spacing.sm, // 8px between list items
  inputHeight: 48, // Standard input/button height
  tabBarHeight: 64, // Custom tab bar height
  headerHeight: 56, // Standard header height
};

export default spacing;
