// Append `sportId=<id>` to a tournament endpoint URL.
// Returns the URL unchanged when sportId is null/undefined/empty —
// matches the include-null filter contract on the server (legacy
// pre-migration data has no sportId and would be filtered out if we
// sent the param defensively).
export function withSport(url, sportId) {
  if (!sportId) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}sportId=${encodeURIComponent(String(sportId))}`;
}
