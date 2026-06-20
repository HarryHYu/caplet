// Thin indirection over the Socket.IO server so route handlers can broadcast
// without importing server.js (avoids a circular dependency). Until Phase B
// calls setIo(), every emit is a safe no-op.
let io = null;

function setIo(instance) {
  io = instance;
}

function academyRoom(classroomId) {
  return `academy:${classroomId}`;
}

function userRoom(userId) {
  return `user:${userId}`;
}

// Broadcast an event to everyone currently viewing a given academy's world.
function emitToAcademy(classroomId, event, payload) {
  if (io) io.to(academyRoom(classroomId)).emit(event, payload);
}

// Push an event to a single user across their open tabs (e.g. wallet update
// after someone buys their listed property).
function emitToUser(userId, event, payload) {
  if (io) io.to(userRoom(userId)).emit(event, payload);
}

module.exports = { setIo, emitToAcademy, emitToUser, academyRoom, userRoom };
