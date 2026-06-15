import API from "./api";

const BASE = `${API.BASE_URL}/stories`;

const STORIES = {
  BASE_URL: BASE,
  ENDPOINTS: {
    CREATE: BASE,                              // POST (multipart for image, JSON for text)
    MINE: `${BASE}/mine`,                      // GET — current user's own active stories
    FEED: `${BASE}/feed`,                      // GET — active stories from others, grouped by user
    VIEW: (id) => `${BASE}/${id}/view`,        // POST — mark as viewed
    DELETE: (id) => `${BASE}/${id}`,           // DELETE
  },
};

export default STORIES;
