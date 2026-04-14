const { z } = require('zod');

/**
 * Validated shape for GET /api/v1/pexels/search query parameters.
 */
const SearchQuerySchema = z.object({

  q: z
    .string()
    .trim()
    .max(100, 'Search term must be 100 characters or fewer')
    .optional(),

  media_type: z
    .enum(['images', 'videos'], {
      errorMap: () => ({ message: "media_type must be 'images' or 'videos'" }),
    })
    .optional()
    .default('images'),

  /**
   * Pexels orientation filter.
   * Only relevant for images.
   */
  orientation: z
    .enum(['all', 'landscape', 'portrait', 'square'], {
      errorMap: () => ({ message: "orientation must be 'all', 'landscape', 'portrait' or 'square'" }),
    })
    .optional()
    .default('all'),

  per_page: z
    .coerce
    .number({ invalid_type_error: 'per_page must be a number' })
    .int()
    .min(1,  'per_page must be at least 1')
    .max(80, 'per_page cannot exceed 80')
    .optional()
    .default(15),

  page: z
    .coerce
    .number({ invalid_type_error: 'page must be a number' })
    .int()
    .min(1, 'page must be at least 1')
    .optional()
    .default(1),

});

module.exports = { SearchQuerySchema };
