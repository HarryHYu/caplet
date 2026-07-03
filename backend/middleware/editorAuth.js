const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./auth');
const EditorWorkspace = require('../models/EditorWorkspace');
const { digestEditorCode, generateEditorCode } = require('../utils/editorCode');

/**
 * /editor is no longer passcode-gated — anyone with the link can use it.
 * There's still exactly one underlying EditorWorkspace row (courses/lessons
 * are scoped to it via workspaceId), so every caller with no token, or an
 * old/invalid editor token from before the gate was removed, is resolved to
 * that same shared workspace instead of being rejected.
 */
let cachedDefaultWorkspaceId = null;

async function defaultWorkspaceId() {
  if (cachedDefaultWorkspaceId) return cachedDefaultWorkspaceId;
  let ws = await EditorWorkspace.findOne({ order: [['createdAt', 'ASC']] });
  if (!ws) {
    // codeDigest is NOT NULL on the model, but nothing reads this one back
    // (the code path that checks it is no longer reachable) — it only
    // exists to satisfy the column.
    ws = await EditorWorkspace.create({ label: 'default', codeDigest: digestEditorCode(generateEditorCode()) });
  }
  cachedDefaultWorkspaceId = ws.id;
  return ws.id;
}

/** Returns the workspaceId to use for this request — from a valid editor JWT if present, else the shared default. */
async function resolveEditorWorkspaceId(token) {
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.typ === 'editor' && decoded.wid) return decoded.wid;
    } catch {
      // fall through to the default workspace
    }
  }
  return defaultWorkspaceId();
}

module.exports = { resolveEditorWorkspaceId, defaultWorkspaceId };
