const { z } = require('zod');

/**
 * Validated shape for GET /api/v1/pixabay/search query parameters.
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
   * Only relevant when media_type === 'images'.
   * 'vector' covers SVG/EPS assets; 'illustration' covers drawn artwork.
   */
  image_type: z
    .enum(['all', 'photo', 'illustration', 'vector'], {
      errorMap: () => ({ message: "image_type must be 'all', 'photo', 'illustration' or 'vector'" }),
    })
    .optional()
    .default('all'),

  /**
   * Pixabay content categories.
   * @see https://pixabay.com/api/docs/#api_search_images
   */
  category: z
    .enum([
      'all',
      'backgrounds', 'fashion', 'nature', 'science', 'education',
      'feelings', 'health', 'people', 'religion', 'places',
      'animals', 'industry', 'computer', 'food', 'sports',
      'transportation', 'travel', 'buildings', 'business', 'music',
    ])
    .optional()
    .default('all'),

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
    .min(3,   'per_page must be at least 3')
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
