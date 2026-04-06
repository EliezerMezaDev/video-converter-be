const fs = require('fs');

/**
 * Deletes a file from disk, logging the result.
 * Silently skips if the file does not exist; logs errors without throwing.
 *
 * @param {string} filePath  - Absolute path of the file to delete
 * @param {string} [label=''] - Optional context label used in log messages
 */
const safeDelete = (filePath, label = '') => {
  const tag = label ? ` (${label})` : '';
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Cleanup] 🗑️  Deleted${tag}: ${filePath}`);
    }
  } catch (err) {
    console.error(`[Cleanup] ❌ Failed to delete${tag} ${filePath}:`, err.message);
  }
};

module.exports = { safeDelete };
