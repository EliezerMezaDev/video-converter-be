const DEFAULT_FEATURES = {
  feats: {
    converter: {
      fileMaxSize: 500,     // MB
    },
    musicSearch: {
      cacheTTL: 600, // seconds — how long search results are cached
      requestTimeout: 5000, // ms     — upstream Jamendo request timeout
    },
    pixabaySearch: {
      cacheTTL: 600, // seconds — how long Pixabay search results are cached
      requestTimeout: 8000, // ms     — upstream Pixabay request timeout
    },
  },
  keys: {
    jamendo: {
      clientId: '',
    },
    pixabay: {
      apiKey: '',
    },
  },
};

/**
 * Recursively merges `source` into `target`, preferring source values.
 * Does not mutate either argument.
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source ?? {})) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(target[key] ?? {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Parses FEATURES_SETTINGS from the environment and deep-merges it with
 * the defaults above so missing keys never throw at runtime.
 *
 * Expected format (single-line JSON string in .env):
 *   FEATURES_SETTINGS={"feats":{"converter":{"fileMaxSize":500},"musicSearch":{"cacheTTL":600,"requestTimeout":5000}},"keys":{"jamendo":{"clientId":"YOUR_KEY"}}}
 */
function parseFeatures() {
  const raw = process.env.FEATURES_SETTINGS;

  if (!raw) {
    console.warn('[Config] ⚠️  FEATURES_SETTINGS not set — using defaults');
    return DEFAULT_FEATURES;
  }

  try {
    const parsed = JSON.parse(raw);
    const features = deepMerge(DEFAULT_FEATURES, parsed);
    console.log('[Config] ✅ FEATURES_SETTINGS loaded:', JSON.stringify(features));
    return features;
  } catch (err) {
    console.error('[Config] ❌ Failed to parse FEATURES_SETTINGS:', err.message, '— using defaults');
    return DEFAULT_FEATURES;
  }
}

const features = parseFeatures();

module.exports = features;
