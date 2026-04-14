const { SearchQuerySchema } = require('./pexels-search.model');
const { searchMedia } = require('./pexels-search.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

const handleApiError = (err, res, context) => {
  const status = err.response?.status;

  if (status === 429) {
    console.warn(`[PexelsSearch] ⚠️  Rate limit hit | context=${context}`);
    return res.status(429).json({ error: 'Pexels API rate limit reached. Please try again later.' });
  }

  if (status === 401) {
    console.warn(`[PexelsSearch] ⚠️  Unauthorized | context=${context}`);
    return res.status(500).json({ error: 'Pexels API key is invalid or not configured.' });
  }

  if (status === 400) {
    console.warn(`[PexelsSearch] ⚠️  Bad request | context=${context} | msg=${err.message}`);
    return res.status(400).json({ error: 'Invalid request to Pexels API. Check your parameters.' });
  }

  console.error(`[PexelsSearch] ❌ ${context}:`, err.message);
  return res.status(500).json({ error: `Failed to ${context}` });
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/v1/pexels/search
 *
 * Validates query params via Zod, proxies the Pexels search,
 * and returns a normalized JSON response.
 *
 * Query params:
 *   q            - Search term (optional; without it Pexels returns curated content)
 *   media_type   - 'images' | 'videos'  (default: 'images')
 *   orientation  - 'all' | 'landscape' | 'portrait' | 'square' (default: 'all')
 *   per_page     - Results per page (1–80, default: 15)
 *   page         - Page number (default: 1)
 */
const search = async (req, res) => {
  const parsed = SearchQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid query parameters',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const result = await searchMedia(parsed.data);
    return res.status(200).json(result);
  } catch (err) {
    return handleApiError(err, res, 'fetch Pexels results');
  }
};

module.exports = { search };
