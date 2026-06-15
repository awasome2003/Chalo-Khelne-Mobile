/**
 * DEPRECATED — Use `import { colors, spacing, typography, shadows } from '../theme'` instead.
 * This file re-exports from the new theme system for backward compatibility.
 */
import theme from "../theme";
import colors from "./colors";

export const { spacing, radius, fontSize, fontWeight, shadows } = theme;

export { theme, colors };

export default { ...theme, colors };
