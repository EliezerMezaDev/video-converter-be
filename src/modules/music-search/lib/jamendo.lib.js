const axios = require('axios');
const features = require('../../../config/features');

const BASE_URL = 'https://api.jamendo.com/v3.0/tracks/';

const getClientId = () => features.keys?.jamendo?.clientId;
const getTimeout  = () => features.feats?.musicSearch?.requestTimeout ?? 5000;

// Jamendo order values
const ORDER_MAP = {
  popular: 'popularity_total',
  latest:  'releasedate',
};

/**
 * Searches the Jamendo Music API.
 *
 * @param {Object} params - { q, genre, order, per_page, page }
 * @returns {Promise<Object>} Raw Jamendo response
 */
const search = async ({ q, genre, order, per_page = 20, page = 1 } = {}) => {
  const clientId = getClientId();
  if (!clientId) throw new Error('Jamendo client_id is not configured (keys.jamendo.clientId)');

  const params = {
    client_id: clientId,
    format:    'json',
    limit:     per_page,
    offset:    (page - 1) * per_page,
    include:   'musicinfo',
    order:     ORDER_MAP[order] || 'popularity_total',
  };

  if (q)     params.namesearch = q;
  if (genre) params.fuzzytags  = genre;

  const { data } = await axios.get(BASE_URL, { params, timeout: getTimeout() });
  return data;
};

/**
 * Fetches a single Jamendo track by its numeric ID.
 *
 * @param {string|number} id
 * @returns {Promise<Object|null>} Track object or null if not found
 */
const fetchById = async (id) => {
  const clientId = getClientId();
  if (!clientId) throw new Error('Jamendo client_id is not configured');

  const { data } = await axios.get(BASE_URL, {
    params: { client_id: clientId, format: 'json', id, include: 'musicinfo' },
    timeout: getTimeout(),
  });

  return data.results?.[0] ?? null;
};

/**
 * Returns an axios stream response for the given Jamendo audio URL.
 * The caller is responsible for piping `response.data` to the client.
 *
 * @param {string} url - Direct Jamendo CDN audio URL
 * @returns {Promise<AxiosResponse>}
 */
const streamUrl = async (url) => {
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout:      getTimeout(),
    headers:      { 'User-Agent': 'Mozilla/5.0' },
  });
  return response;
};

module.exports = { search, fetchById, streamUrl };
