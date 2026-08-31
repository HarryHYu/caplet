/**
 * Socket.IO client for Study Parties (/party namespace). Logged-in users
 * only — the party shares your own essay progress under your account name.
 * All party state (progress, money, chat) lives in server memory for the
 * life of the party and nowhere else.
 */
import { io } from 'socket.io-client';
import api from './api';

function socketOrigin() {
  return api.baseURL.replace(/\/api\/?$/, '');
}

export function connectPartySocket() {
  return io(`${socketOrigin()}/party`, {
    auth: { token: api.token },
    transports: ['websocket', 'polling'],
  });
}
