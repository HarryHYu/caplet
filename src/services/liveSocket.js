/**
 * Thin socket.io-client wrapper for live hosted quiz sessions.
 *
 * There are two roles, each with its own token:
 *   - host:        the logged-in teacher/creator's normal auth JWT, plus the
 *                   sessionId they're hosting (backend verifies they own it)
 *   - participant:  the scoped JWT minted by POST /api/live/join, no account
 *                   needed
 *
 * Reconnection is handled by socket.io-client's defaults (reconnection: true)
 * — a dropped wifi connection during a live game just resumes; the server's
 * `state:update` on participant (re)connect catches the client back up.
 */
import { io } from 'socket.io-client';
import api from './api';

/** The API base URL includes a trailing /api; Socket.IO connects to the bare origin. */
function socketOrigin() {
  return api.baseURL.replace(/\/api\/?$/, '');
}

function connect(auth) {
  return io(`${socketOrigin()}/live`, {
    auth,
    transports: ['websocket', 'polling'],
  });
}

/** Connects as the host of `sessionId` using the current user's own auth token. */
export function connectHostSocket(sessionId) {
  return connect({ token: api.token, sessionId });
}

/** Connects as an anonymous (or opportunistically-linked) participant. */
export function connectParticipantSocket(participantToken) {
  return connect({ token: participantToken });
}
