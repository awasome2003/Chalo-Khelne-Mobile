/**
 * Sentry crash & error reporting — Phase 0 safety net for the stack migration.
 *
 * Deliberately a NO-OP until a DSN is provided via the EXPO_PUBLIC_SENTRY_DSN
 * env var, so this can ship immediately without a Sentry account and without
 * changing runtime behavior. Once you create a Sentry project:
 *   1. Put the DSN in `.env` as EXPO_PUBLIC_SENTRY_DSN=...
 *   2. (For release source maps) add { organization, project } to the
 *      "@sentry/react-native" plugin entry in app.json.
 */
import * as Sentry from "@sentry/react-native";

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const isSentryEnabled = !!DSN;

export function initSentry() {
  if (!DSN) {
    // No DSN configured yet — skip init so nothing is sent and nothing breaks.
    return;
  }
  Sentry.init({
    dsn: DSN,
    environment: process.env.EXPO_PUBLIC_ENV || "development",
    // Native crash capture on iOS/Android.
    enableNative: true,
    // Keep performance tracing light until we tune it in a later phase.
    tracesSampleRate: 0.2,
    // Don't spam the dashboard from local dev builds unless explicitly enabled.
    enabled: process.env.EXPO_PUBLIC_ENV === "production",
  });
}

export { Sentry };
