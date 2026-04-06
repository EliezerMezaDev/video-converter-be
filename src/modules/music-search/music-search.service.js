const NodeCache = require('node-cache');
const features = require('../../config/features');
const jamendo  = require('./lib/jamendo.lib');

const cacheTTL = features.feats?.musicSearch?.cacheTTL ?? 600;
const cache    = new NodeCache({ stdTTL: cacheTTL, checkperiod: 120, useClones: false });

const SEARCH_PREFIX  = 'music:search:';
const PREVIEW_PREFIX = 'music:preview:';

// ── Normalizer ────────────────────────────────────────────────────────────────

/**
 * Maps a raw Jamendo track to the standard client-facing shape.
 *
 * Jamendo fields used:
 *   id, name, duration, artist_name, musicinfo.tags.genres, audio, audiodownload
 *
 * @param {Object} track    - Raw Jamendo track object
 * @param {string} baseUrl  - Server base URL for the proxy preview href
 * @returns {Object}
 */
const normalizeTrack = (track, baseUrl) => ({
  id:          String(track.id),
  title:       track.name          ?? 'Untitled',
  duration:    track.duration      ?? 0,
  tags:        track.musicinfo?.tags?.genres ?? [],
  user:        track.artist_name   ?? null,
  previewUrl:  `${baseUrl}/api/v1/music/preview/${track.id}`,
  downloadUrl: track.audiodownload ?? track.shareurl ?? null,
});

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Searches for tracks on Jamendo, applying caching.
 *
 * Pagination note: Jamendo does not expose a reliable total count endpoint.
 * We estimate: if we received a full page (results.length === per_page),
 * we add one more virtual page to ensure the "Next" button appears.
 * When the last page returns fewer results, we report the exact total.
 *
 * @param {Object} params   - Validated query params from the Zod model
 * @param {string} baseUrl  - Server origin (e.g. "http://localhost:3101")
 * @returns {Promise<{ total: number, results: Object[] }>}
 */
const searchTracks = async (params, baseUrl) => {
  const cacheKey = SEARCH_PREFIX + JSON.stringify(params);

  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`[MusicSearch] 📦 Cache hit | key=${cacheKey}`);
    return cached;
  }

  console.log(`[MusicSearch] 🔍 Fetching from Jamendo | params=${JSON.stringify(params)}`);
  const data = await jamendo.search(params);

  const tracks = data.results ?? [];
  const offset = (params.page - 1) * params.per_page;

  // Estimate total: full page means there may be more; partial page means last page
  const isFullPage = tracks.length >= params.per_page;
  const total = isFullPage
    ? offset + params.per_page * 2   // at least one more page
    : offset + tracks.length;        // exact last-page count

  // Cache the direct audio URL per track for the /preview/:id endpoint
  for (const track of tracks) {
    if (track.audio) {
      cache.set(PREVIEW_PREFIX + track.id, track.audio);
    }
  }

  const result = {
    total,
    results: tracks.map((track) => normalizeTrack(track, baseUrl)),
  };

  cache.set(cacheKey, result);
  return result;
};

/**
 * Resolves the Jamendo CDN audio URL for a given track ID.
 * Checks preview cache first (populated by searchTracks); falls back to
 * a direct Jamendo ID lookup when the track wasn't in a recent search.
 *
 * @param {string} id
 * @returns {Promise<string>} Resolved CDN audio URL
 * @throws {Error} If the track or audio URL cannot be found
 */
const resolvePreviewUrl = async (id) => {
  const cached = cache.get(PREVIEW_PREFIX + id);
  if (cached) {
    console.log(`[MusicSearch] 📦 Preview URL from cache | id=${id}`);
    return cached;
  }

  console.log(`[MusicSearch] 🔍 Fetching track by ID from Jamendo | id=${id}`);
  const track = await jamendo.fetchById(id);

  if (!track)       throw new Error(`Track not found: ${id}`);
  if (!track.audio) throw new Error(`Track ${id} has no audio URL`);

  cache.set(PREVIEW_PREFIX + id, track.audio);
  return track.audio;
};

module.exports = { searchTracks, resolvePreviewUrl };
