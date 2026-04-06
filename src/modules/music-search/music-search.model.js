const { z } = require('zod');

/**
 * Validated shape for GET /api/v1/music/search query parameters.
 */
const SearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100, 'Search term must be 100 characters or fewer')
    .optional(),

  genre: z
    .string()
    .trim()
    .max(50)
    .optional(),

  order: z
    .enum(['popular', 'latest'], {
      errorMap: () => ({ message: "order must be 'popular' or 'latest'" }),
    })
    .optional()
    .default('popular'),

  per_page: z
    .coerce
    .number({ invalid_type_error: 'per_page must be a number' })
    .int()
    .min(3, 'per_page must be at least 3')
    .max(200, 'per_page cannot exceed 200')
    .optional()
    .default(20),

  page: z
    .coerce
    .number({ invalid_type_error: 'page must be a number' })
    .int()
    .min(1, 'page must be at least 1')
    .optional()
    .default(1),

});

module.exports = { SearchQuerySchema };
