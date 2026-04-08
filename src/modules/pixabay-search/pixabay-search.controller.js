const { SearchQuerySchema } = require('./pixabay-search.model');
const { searchMedia } = require('./pixabay-search.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

const handleApiError = (err, res, context) => {
  const status = err.response?.status;

  if (status === 429) {
    console.warn(`[PixabaySearch] ⚠️  Rate limit hit | context=${context}`);
    return res.status(429).json({ error: 'Pixabay API rate limit reached. Please try again in a minute.' });
  }

  if (status === 400) {
    console.warn(`[PixabaySearch] ⚠️  Bad request | context=${context} | msg=${err.message}`);
    return res.status(400).json({ error: 'Invalid request to Pixabay API. Check your parameters.' });
  }

  console.error(`[PixabaySearch] ❌ ${context}:`, err.message);
  return res.status(500).json({ error: `Failed to ${context}` });
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/v1/pixabay/search
 *
 * Validates query params via Zod, proxies the Pixabay search,
 * and returns a normalized JSON response.
 *
 * Query params:
 *   q           - Search term
 *   media_type  - 'images' | 'videos'  (default: 'images')
 *   image_type  - 'all' | 'photo' | 'illustration' | 'vector' (default: 'all')
 *   category    - Pixabay category (optional)
 *   order       - 'popular' | 'latest' (default: 'popular')
 *   per_page    - Results per page (3–200, default: 20)
 *   page        - Page number (default: 1)
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
    return handleApiError(err, res, 'fetch Pixabay results');
  }
};

module.exports = { search };
