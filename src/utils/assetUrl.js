import API from "../api/api";

/**
 * assetUrl(path) — resolve a backend image path to a uri for <Image>.
 *
 * Mirrors the web panel's helper so both platforms render the same images the
 * same way. Handles: relative ("turfs/x.jpg"), leading "uploads/"
 * ("uploads/certificates/x.jpg"), Windows backslashes, and already-full URLs
 * (e.g. payment QR). Returns null for empty input so callers can branch to a
 * placeholder.
 *
 *   <Image source={{ uri: assetUrl(item.image) }} />
 */
const ORIGIN = API.SERVER_URL; // e.g. https://chalokhelne.com (prod) / http://192.168.x.x:3003 (dev)

export function assetUrl(path) {
  if (!path || typeof path !== "string") return null;
  const t = path.trim();
  if (!t) return null;
  if (/^(https?:)?\/\//i.test(t)) return t; // already absolute
  if (/^data:/i.test(t)) return t;
  let p = t.replace(/\\/g, "/").replace(/^\/+/, ""); // backslashes + leading slashes
  p = p.replace(/^uploads\//i, ""); // drop a leading "uploads/" so we don't double it
  return `${ORIGIN}/uploads/${p}`;
}

export default assetUrl;
