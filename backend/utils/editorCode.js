const crypto = require('crypto');

function digestEditorCode(plain) {
  return crypto.createHash('sha256').update(String(plain).trim(), 'utf8').digest('hex');
}

/** URL-safe random string; store only digest in DB. */
function generateEditorCode() {
  return crypto.randomBytes(18).toString('base64url');
}

module.exports = { digestEditorCode, generateEditorCode };
