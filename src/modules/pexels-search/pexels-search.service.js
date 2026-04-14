const NodeCache = require('node-cache');
const features  = require('../../config/features');
const pexels    = require('./lib/pexels.lib');

const cacheTTL = features.feats?.pexelsSearch?.cacheTTL ?? 600;
const cache    = new NodeCache({ stdTTL: cacheTTL, checkperiod: 120, useClones: false });

const SEARCH_PREFIX = 'pexels:search:';

// ── Normalizers ───────────────────────────────────────────────────────────────

/**
 * Derives a tags array from the Pexels photo alt text.
 * Falls back to an empty array if alt is not present.
 *
 * @param {string|undefined} alt
 * @returns {string[]}
 */
const parseTags = (alt) => {
  if (!alt) return [];
  // alt text is usually a short sentence — split into words as a best-effort approach
  return alt
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10);
};

/**
 * Maps a raw Pexels photo object to the standard client-facing shape.
 *
 * @param {Object} photo - Raw Pexels photo object
 * @returns {Object}
 */
const normalizePhoto = (photo) => ({
  id:           String(photo.id),
  type:         'photo',
  tags:         parseTags(photo.alt),
  previewUrl:   photo.src?.small    ?? null,
  webformatUrl: photo.src?.medium   ?? null,
  largeUrl:     photo.src?.large2x  ?? photo.src?.large ?? null,
  downloadUrl:  photo.src?.original ?? null,
  pageUrl:      photo.url           ?? null,
  user:         photo.photographer  ?? null,
  userImageUrl: photo.photographer_url ?? null,
  width:        photo.width         ?? 0,
  height:       photo.height        ?? 0,
  views:        0,
  downloads:    0,
  likes:        0,
  duration:     null,
});

/**
 * Picks the best video file link by quality preference.
 *
 * @param {Object[]} videoFiles - Array of Pexels video_files
 * @param {string}   quality   - Preferred quality: 'uhd' | 'hd' | 'sd'
 * @returns {string|null}
 */
const pickVideoLink = (videoFiles = [], quality) =>
  videoFiles.find((f) => f.quality === quality)?.link ?? null;

/**
 * Maps a raw Pexels video object to the standard client-facing shape.
 *
 * @param {Object} video - Raw Pexels video object
 * @returns {Object}
 */
const normalizeVideo = (video) => {
  const files = video.video_files ?? [];

  const uhdUrl = pickVideoLink(files, 'uhd');
  const hdUrl  = pickVideoLink(files, 'hd');
  const sdUrl  = pickVideoLink(files, 'sd');

  // Primary stream: prefer HD, then SD, then UHD
  const streamUrl = hdUrl ?? sdUrl ?? uhdUrl ?? null;

  // Thumbnail: first video_picture or the preview image field
  const thumbnail = video.video_pictures?.[0]?.picture ?? video.image ?? null;

  return {
    id:           String(video.id),
    type:         'video',
    tags:         parseTags(video.url),     // Pexels videos have no alt; use URL slug as best-effort
    previewUrl:   thumbnail,
    webformatUrl: thumbnail,
    largeUrl:     uhdUrl ?? hdUrl ?? null,
    downloadUrl:  streamUrl,
    pageUrl:      video.url              ?? null,
    user:         video.user?.name       ?? null,
    userImageUrl: video.user?.url        ?? null,
    width:        video.width            ?? 0,
    height:       video.height           ?? 0,
    views:        0,
    downloads:    0,
    likes:        0,
    duration:     video.duration         ?? null,
    // Quality-specific URLs for the FE video player
    videos: {
      large:  uhdUrl,
      medium: hdUrl,
      small:  sdUrl,
      tiny:   sdUrl,
    },
  };
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Searches Pexels for photos or videos, applying in-memory caching.
 *
 * @param {Object} params - Validated query params from the Zod model
 * @returns {Promise<{ total: number, totalHits: number, results: Object[] }>}
 */
const searchMedia = async (params) => {
  const cacheKey = SEARCH_PREFIX + JSON.stringify(params);

  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`[PexelsSearch] 📦 Cache hit | key=${cacheKey}`);
    return cached;
  }

  const isVideo = params.media_type === 'videos';
  console.log(`[PexelsSearch] 🔍 Fetching from Pexels | media=${params.media_type} | params=${JSON.stringify(params)}`);

  const data = isVideo
    ? await pexels.searchVideos({ query: params.q, orientation: params.orientation, per_page: params.per_page, page: params.page })
    : await pexels.searchPhotos({ query: params.q, orientation: params.orientation, per_page: params.per_page, page: params.page });

  const items = isVideo ? (data.videos ?? []) : (data.photos ?? []);
  const total = data.total_results ?? 0;

  const result = {
    total:     total,
    totalHits: total,
    results:   isVideo
      ? items.map(normalizeVideo)
      : items.map(normalizePhoto),
  };

  cache.set(cacheKey, result);
  return result;
};

module.exports = { searchMedia };
