import { QueryClient } from "@tanstack/react-query";

// Phase 6: the mobile app had NO server-state cache (Context + per-screen
// fetches). This QueryClient gives caching, dedupe, and background refetch.
// Conservative defaults for mobile (don't hammer the API on every focus).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s — screens re-mount often on mobile nav
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
