const NodeCache = require('node-cache');
const features  = require('../../config/features');
const pixabay   = require('./lib/pixabay.lib');

const cacheTTL = features.feats?.pixabaySearch?.cacheTTL ?? 600;
const cache    = new NodeCache({ stdTTL: cacheTTL, checkperiod: 120, useClones: false });

const SEARCH_PREFIX = 'pixabay:search:';

// ── Normalizers ───────────────────────────────────────────────────────────────

/**
 * Maps a raw Pixabay image hit to the standard client-facing shape.
 *
 * @param {Object} hit - Raw Pixabay image object
 * @returns {Object}
 */
const normalizeImage = (hit) => ({
  id:           String(hit.id),
  type:         hit.type ?? 'photo',          // 'photo' | 'illustration' | 'vector'
  tags:         hit.tags ? hit.tags.split(', ') : [],
  previewUrl:   hit.previewURL   ?? null,
  webformatUrl: hit.webformatURL ?? null,
  largeUrl:     hit.largeImageURL ?? hit.webformatURL ?? null,
  downloadUrl:  hit.largeImageURL ?? hit.webformatURL ?? null,
  pageUrl:      hit.pageURL      ?? null,
  user:         hit.user         ?? null,
  userImageUrl: hit.userImageURL ?? null,
  width:        hit.imageWidth   ?? hit.webformatWidth  ?? 0,
  height:       hit.imageHeight  ?? hit.webformatHeight ?? 0,
  views:        hit.views        ?? 0,
  downloads:    hit.downloads    ?? 0,
  likes:        hit.likes        ?? 0,
  duration:     null,
});

/**
 * Maps a raw Pixabay video hit to the standard client-facing shape.
 *
 * @param {Object} hit - Raw Pixabay video object
 * @returns {Object}
 */
const normalizeVideo = (hit) => {
  const videos  = hit.videos ?? {};
  const medium  = videos.medium  ?? {};
  const small   = videos.small   ?? {};
  const tiny    = videos.tiny    ?? {};

  const streamUrl = medium.url || small.url || tiny.url || null;
  const thumbnail = medium.thumbnail || small.thumbnail || tiny.thumbnail || null;

  return {
    id:           String(hit.id),
    type:         'video',
    tags:         hit.tags ? hit.tags.split(', ') : [],
    previewUrl:   thumbnail,
    webformatUrl: thumbnail,
    largeUrl:     (videos.large?.url || streamUrl),
    downloadUrl:  streamUrl,
    pageUrl:      hit.pageURL ?? null,
    user:         hit.user    ?? null,
    userImageUrl: hit.userImageURL ?? null,
    width:        medium.width  ?? small.width  ?? 0,
    height:       medium.height ?? small.height ?? 0,
    views:        hit.views     ?? 0,
    downloads:    hit.downloads ?? 0,
    likes:        hit.likes     ?? 0,
    duration:     hit.duration  ?? null,
    videos: {
      large:  videos.large?.url  ?? null,
      medium: medium.url         ?? null,
      small:  small.url          ?? null,
      tiny:   tiny.url           ?? null,
    },
  };
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Searches Pixabay for images or videos, applying caching.
 *
 * Pagination note: Pixabay caps totalHits at 500 for free accounts.
 * We store the real totalHits for the pagination display.
 *
 * @param {Object} params - Validated query params from the Zod model
 * @returns {Promise<{ total: number, totalHits: number, results: Object[] }>}
 */
const searchMedia = async (params) => {
  const cacheKey = SEARCH_PREFIX + JSON.stringify(params);

  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`[PixabaySearch] 📦 Cache hit | key=${cacheKey}`);
    return cached;
  }

  const isVideo = params.media_type === 'videos';
  console.log(`[PixabaySearch] 🔍 Fetching from Pixabay | media=${params.media_type} | params=${JSON.stringify(params)}`);

  const data = isVideo
    ? await pixabay.searchVideos(params)
    : await pixabay.searchImages(params);

  const hits = data.hits ?? [];

  const result = {
    total:     data.total     ?? 0,
    totalHits: data.totalHits ?? 0,
    results:   isVideo
      ? hits.map(normalizeVideo)
      : hits.map(normalizeImage),
  };

  cache.set(cacheKey, result);
  return result;
};

module.exports = { searchMedia };
