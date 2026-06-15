import API from "./api";

const BASE = `${API.BASE_URL}/planner`;

const PLANNER = {
  BASE_URL: BASE,
  ENDPOINTS: {
    CREATE: BASE,                              // POST
    UPDATE: (id) => `${BASE}/${id}`,           // PUT
    DELETE: (id) => `${BASE}/${id}`,           // DELETE
    BY_ID: (id) => `${BASE}/${id}`,            // GET
    FEED: (userId) => `${BASE}/feed/${userId}`, // GET (merged feed)
  },
};

export default PLANNER;
