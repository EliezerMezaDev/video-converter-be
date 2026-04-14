const axios = require('axios');
const features = require('../../../config/features');

const PHOTOS_SEARCH_URL  = 'https://api.pexels.com/v1/search';
const PHOTOS_CURATED_URL = 'https://api.pexels.com/v1/curated';
const VIDEOS_SEARCH_URL  = 'https://api.pexels.com/videos/search';
const VIDEOS_POPULAR_URL = 'https://api.pexels.com/videos/popular';

const getApiKey  = () => features.keys?.pexels?.apiKey;
const getTimeout = () => features.feats?.pexelsSearch?.requestTimeout ?? 8000;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns an axios instance pre-configured with the Pexels Authorization header.
 * Throws if the API key is not set.
 */
const getClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Pexels API key is not configured (keys.pexels.apiKey)');
  return axios.create({
    headers: { Authorization: apiKey },
    timeout: getTimeout(),
  });
};

// ── API functions ─────────────────────────────────────────────────────────────

/**
 * Search photos on Pexels, or return curated photos when no query is given.
 * Pexels requires `query` on the search endpoint — without it we use /v1/curated.
 *
 * @param {Object} params - { query, orientation, per_page, page }
 * @returns {Promise<Object>} Raw Pexels response (shape: { photos[], total_results, ... })
 */
const searchPhotos = async ({ query, orientation, per_page = 15, page = 1 } = {}) => {
  const client = getClient();

  const hasQuery = query && query.trim().length > 0;

  if (hasQuery) {
    const params = { query: query.trim(), per_page, page };
    if (orientation && orientation !== 'all') params.orientation = orientation;
    const { data } = await client.get(PHOTOS_SEARCH_URL, { params });
    return data;
  }

  // No query → curated endpoint (orientation not supported here)
  const params = { per_page, page };
  const { data } = await client.get(PHOTOS_CURATED_URL, { params });
  // Curated response lacks total_results; expose a sensible fallback
  return { ...data, total_results: data.total_results ?? per_page };
};

/**
 * Search videos on Pexels, or return popular videos when no query is given.
 * Pexels requires `query` on the videos/search endpoint — without it we use /videos/popular.
 *
 * @param {Object} params - { query, orientation, per_page, page }
 * @returns {Promise<Object>} Raw Pexels response (shape: { videos[], total_results, ... })
 */
const searchVideos = async ({ query, orientation, per_page = 15, page = 1 } = {}) => {
  const client = getClient();

  const hasQuery = query && query.trim().length > 0;

  if (hasQuery) {
    const params = { query: query.trim(), per_page, page };
    if (orientation && orientation !== 'all') params.orientation = orientation;
    const { data } = await client.get(VIDEOS_SEARCH_URL, { params });
    return data;
  }

  // No query → popular videos endpoint
  const params = { per_page, page };
  const { data } = await client.get(VIDEOS_POPULAR_URL, { params });
  return { ...data, total_results: data.total_results ?? per_page };
};

module.exports = { searchPhotos, searchVideos };

