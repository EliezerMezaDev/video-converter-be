const axios = require('axios');
const features = require('../../../config/features');

const PIXABAY_BASE_URL = 'https://pixabay.com/api/music/';

const getApiKey = () => features.keys?.pixabay?.apiKey;
const getTimeout = () => features.feats?.musicSearch?.requestTimeout ?? 5000;

/**
 * Searches the Pixabay Music API with the given parameters.
 * @param {Object} params  - Query params (q, genre, order, per_page, id)
 * @returns {Promise<Object>} Raw Pixabay response
 */
const search = async (params = {}) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Pixabay API key is not configured (keys.pixabay.apiKey)');

  const { data } = await axios.get(PIXABAY_BASE_URL, {
    params: { key: apiKey, ...params },
    timeout: getTimeout(),
  });

  return data;
};

/**
 * Fetches a single track from Pixabay by its ID.
 * @param {string|number} id
 * @returns {Promise<Object|null>} Track hit or null if not found
 */
const fetchById = async (id) => {
  const data = await search({ id });
  return data.hits?.[0] ?? null;
};

/**
 * Returns an axios stream response for the given audio URL.
 * The caller is responsible for piping `response.data` to the client.
 * @param {string} url  - Direct CDN URL to the audio file
 * @returns {Promise<AxiosResponse>}
 */
const streamUrl = async (url) => {
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: getTimeout(),
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  return response;
};

module.exports = { search, fetchById, streamUrl };
