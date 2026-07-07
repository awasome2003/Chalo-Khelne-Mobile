// Flat ESLint config (ESLint 9). Extends the Expo preset and disables rules
// that conflict with Prettier. Phase 0 baseline — kept intentionally lenient so
// linting the existing ~120-screen JS codebase is actionable, not a wall of noise.
const expoConfig = require("eslint-config-expo/flat");
const eslintConfigPrettier = require("eslint-config-prettier");

module.exports = [
  ...expoConfig,
  eslintConfigPrettier,
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "assets/**",
      "babel.config.js",
    ],
  },
  {
    rules: {
      // ── Phase 0 baseline calibration ───────────────────────────────
      // Establish a PASSING baseline, then ratchet rules up in later phases.
      // Off = purely cosmetic or false-positive on RN native modules.
      "react/no-unescaped-entities": "off", // 60+ apostrophes in JSX copy — cosmetic
      "import/namespace": "off", // false positives on RN native module namespaces
      // Warn = real backlog to burn down (not blocking yet):
      "import/no-unresolved": "warn", // mostly undeclared react-native-vector-icons (tech debt)
      "no-dupe-keys": "warn", // duplicate StyleSheet keys — later def wins, cosmetic
      "react/display-name": "warn",
      // no-undef stays an ERROR — it catches real ReferenceError crashes.

      // ── Phase 4 hook ───────────────────────────────────────────────
      // Flip this to "warn" (then "error") in Phase 4 to force theme tokens
      // (src/theme) instead of hardcoded hex colors. Left OFF now so Phase 0
      // lint is clean across the legacy screens.
      "no-restricted-syntax": [
        "off",
        {
          selector: "Literal[value=/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
          message:
            "Use a theme token from src/theme instead of a hardcoded hex color (Phase 4).",
        },
      ],
    },
  },
];
