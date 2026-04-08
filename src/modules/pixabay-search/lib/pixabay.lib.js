const axios = require('axios');
const features = require('../../../config/features');

const IMAGES_URL = 'https://pixabay.com/api/';
const VIDEOS_URL = 'https://pixabay.com/api/videos/';

const getApiKey = () => features.keys?.pixabay?.apiKey;
const getTimeout = () => features.feats?.pixabaySearch?.requestTimeout ?? 8000;

// Pixabay order values
const ORDER_MAP = {
  popular: 'popular',
  latest: 'latest',
};

/**
 * Search images (photos, illustrations, vectors) on Pixabay.
 *
 * @param {Object} params - { q, image_type, category, order, per_page, page }
 * @returns {Promise<Object>} Raw Pixabay response
 */
const searchImages = async ({ q, image_type = 'all', category, order = 'popular', per_page = 20, page = 1 } = {}) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Pixabay API key is not configured (keys.pixabay.apiKey)');

  const params = {
    key: apiKey,
    image_type: image_type === 'all' ? undefined : image_type,
    order: ORDER_MAP[order] || 'popular',
    per_page,
    page,
    safesearch: true,
  };

  if (q) params.q = q;
  if (category && category !== 'all') params.category = category;

  // Remove undefined keys so they are not sent as "undefined" strings
  Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);

  const { data } = await axios.get(IMAGES_URL, { params, timeout: getTimeout() });
  return data;
};

/**
 * Search videos on Pixabay.
 *
 * @param {Object} params - { q, category, order, per_page, page }
 * @returns {Promise<Object>} Raw Pixabay response
 */
const searchVideos = async ({ q, category, order = 'popular', per_page = 20, page = 1 } = {}) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Pixabay API key is not configured (keys.pixabay.apiKey)');

  const params = {
    key: apiKey,
    order: ORDER_MAP[order] || 'popular',
    per_page,
    page,
    safesearch: true,
  };

  if (q) params.q = q;
  if (category && category !== 'all') params.category = category;

  Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);

  const { data } = await axios.get(VIDEOS_URL, { params, timeout: getTimeout() });
  return data;
};

module.exports = { searchImages, searchVideos };
