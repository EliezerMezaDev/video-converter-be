const { SearchQuerySchema } = require('./music-search.model');
const { searchTracks, resolvePreviewUrl } = require('./music-search.service');
const jamendo = require('./lib/jamendo.lib');

// ── Helpers ───────────────────────────────────────────────────────────────────

const handleApiError = (err, res, context) => {
  const status = err.response?.status;

  if (status === 429) {
    console.warn(`[MusicSearch] ⚠️  Rate limit hit | context=${context}`);
    return res.status(429).json({ error: 'API rate limit reached. Please try again later.' });
  }

  console.error(`[MusicSearch] ❌ ${context}:`, err.message);
  return res.status(500).json({ error: `Failed to ${context}` });
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/v1/music/search
 *
 * Validates query params via Zod, proxies the Jamendo search,
 * and returns a normalized JSON response.
 */
const search = async (req, res) => {
  const parsed = SearchQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      error:   'Invalid query parameters',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result  = await searchTracks(parsed.data, baseUrl);
    return res.status(200).json(result);
  } catch (err) {
    return handleApiError(err, res, 'fetch music results');
  }
};

/**
 * GET /api/v1/music/preview/:id
 *
 * Resolves the Jamendo CDN preview URL for the given track ID,
 * then tunnels the audio stream to the client without buffering
 * the entire file in memory.
 */
const preview = async (req, res) => {
  const { id } = req.params;

  try {
    const previewUrl = await resolvePreviewUrl(id);
    const upstream   = await jamendo.streamUrl(previewUrl);

    // Forward relevant headers so the browser can render a proper audio player
    res.setHeader('Content-Type',   upstream.headers['content-type']   ?? 'audio/mpeg');
    res.setHeader('Cache-Control',  'public, max-age=600');

    if (upstream.headers['content-length']) {
      res.setHeader('Content-Length', upstream.headers['content-length']);
    }
    if (upstream.headers['accept-ranges']) {
      res.setHeader('Accept-Ranges', upstream.headers['accept-ranges']);
    }

    upstream.data.on('error', (err) => {
      console.error(`[MusicSearch] ❌ Stream error for id=${id}:`, err.message);
      if (!res.headersSent) res.status(500).json({ error: 'Stream error' });
    });

    upstream.data.pipe(res);
  } catch (err) {
    return handleApiError(err, res, 'stream preview');
  }
};

module.exports = { search, preview };
