const DEFAULT_FEATURES = {
  feats: {
    converter: {
      fileMaxSize: 500, // MB
    },
  },
};

/**
 * Parses FEATURES_SETTINGS env var and deep-merges it with defaults.
 * Expected format (JSON string):
 *   {"feats":{"converter":{"fileMaxSize":500}}}
 */
function parseFeatures() {
  const raw = process.env.FEATURES_SETTINGS;

  if (!raw) {
    console.warn('[Config] ⚠️  FEATURES_SETTINGS not set — using defaults');
    return DEFAULT_FEATURES;
  }

  try {
    const parsed = JSON.parse(raw);

    const features = {
      feats: {
        converter: {
          ...DEFAULT_FEATURES.feats.converter,
          ...(parsed?.feats?.converter ?? {}),
        },
      },
    };

    console.log('[Config] ✅ FEATURES_SETTINGS loaded:', JSON.stringify(features));
    return features;
  } catch (err) {
    console.error('[Config] ❌ Failed to parse FEATURES_SETTINGS:', err.message, '— using defaults');
    return DEFAULT_FEATURES;
  }
}

const features = parseFeatures();

module.exports = features;
