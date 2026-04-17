import API from "./api";

const { BASE_URL } = API;

const ENDPOINTS = {
  // Public
  LISTINGS: `${BASE_URL}/donations/listings`,
  LISTING_BY_ID: (id) => `${BASE_URL}/donations/listings/${id}`,

  // Authenticated
  CREATE: `${BASE_URL}/donations/list`,
  UPDATE: (id) => `${BASE_URL}/donations/list/${id}`,
  WITHDRAW: (id) => `${BASE_URL}/donations/list/${id}`,
  MY_LISTINGS: `${BASE_URL}/donations/my-listings`,
  MY_CLAIMS: `${BASE_URL}/donations/my-claims`,
  CLAIM: (id) => `${BASE_URL}/donations/claim/${id}`,
  PAY: (id) => `${BASE_URL}/donations/claim/${id}/pay`,
  VERIFY: (id) => `${BASE_URL}/donations/claim/${id}/verify`,
};

export default {
  BASE_URL,
  ENDPOINTS,
};
