/**
 * Socket.IO Service
 * Manages real-time connection and events
 * Uses /socket.io/socket.io.js served by backend
 */

let socket = null;

export const initSocket = (token) => {
  if (socket?.connected) socket.disconnect();
  socket = window.io(window.location.origin, {
    auth: { token }
  });
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
