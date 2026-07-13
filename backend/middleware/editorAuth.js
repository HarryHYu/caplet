const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./auth');
const EditorWorkspace = require('../models/EditorWorkspace');
/** Resolve a short-lived editor JWT to an existing workspace. */
async function resolveEditorWorkspaceId(token) {
  if (!token) {
    const error = new Error('Editor access code required');
    error.status = 401;
    throw error;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.typ !== 'editor' || !decoded.wid) throw new Error('Invalid editor token type');
    const workspace = await EditorWorkspace.findByPk(decoded.wid);
    if (!workspace) throw new Error('Editor workspace no longer exists');
    return workspace.id;
  } catch {
    const error = new Error('Editor session expired or invalid');
    error.status = 401;
    throw error;
  }
}

async function resolveReviewerUser(req) {
  const token = req.header('X-Caplet-User-Token')?.replace('Bearer ', '');
  if (!token) {
    const error = new Error('Sign in with a verified teacher or administrator account to approve content.');
    error.status = 401;
    throw error;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { TeacherProfile, User } = require('../models');
    const user = await User.findByPk(decoded?.userId);
    if (!user) throw new Error('Reviewer account not found');
    if (user.role === 'admin') return user;
    const profile = await TeacherProfile.findOne({ where: { userId: user.id, status: 'verified' } });
    if (!profile) {
      const error = new Error('Content approval requires a verified teacher or administrator account.');
      error.status = 403;
      throw error;
    }
    return user;
  } catch (error) {
    if (error.status) throw error;
    const invalid = new Error('Reviewer session expired or invalid.');
    invalid.status = 401;
    throw invalid;
  }
}

module.exports = { resolveEditorWorkspaceId, resolveReviewerUser };
