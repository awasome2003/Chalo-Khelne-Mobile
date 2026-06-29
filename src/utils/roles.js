/**
 * The roles a single account can act as, for the role switcher.
 *
 * Every account can always use the base **Player** experience, so "Player" is
 * always included. On top of that we add the currently-active role (`user.role`)
 * and any roles recorded on the account (`user.roles` — e.g. Referee/Trainer the
 * user created). De-duplicated case-insensitively, active role first.
 */
export function getAvailableRoles(user) {
  const raw = [user?.role, "Player", ...(user?.roles || [])].filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const r of raw) {
    const key = String(r).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(r);
    }
  }
  return out;
}

/**
 * Roles array to persist when switching the active role to `newRole`.
 * Keeps every role the account already had (including the one being left and the
 * base Player role) so nothing disappears from the switcher after a switch.
 */
export function mergeRoles(user, newRole) {
  const raw = [user?.role, "Player", ...(user?.roles || []), newRole].filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const r of raw) {
    const key = String(r).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(r);
    }
  }
  return out;
}

export default getAvailableRoles;
