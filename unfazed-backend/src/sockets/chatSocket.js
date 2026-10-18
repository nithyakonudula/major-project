const jwt = require('jsonwebtoken');
const Therapist = require('../models/Therapist');

module.exports = function attachChatSocket(io) {
  io.use(async (socket, next) => {
    const header = socket.handshake.headers.authorization || '';
    const headerToken = header.match(/^Bearer\s+(.+)$/i)?.[1];
    const token = socket.handshake.auth?.token || headerToken;
    if (!token) return next(new Error('Authentication required'));

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return next(new Error('Invalid or expired token'));
      }
      return next(error);
    }

    try {
      const therapist = await Therapist.findById(decoded.id).select('name');
      if (!therapist) return next(new Error('Account not found'));
      socket.data.therapistId = String(therapist._id);
      socket.data.therapistName = therapist.name;
      return next();
    } catch (error) {
      console.error('Socket authentication failed:', error);
      return next(new Error('Socket authentication could not be completed'));
    }
  });

  io.on('connection', (socket) => {
    const room = `therapist:${socket.data.therapistId}`;
    socket.join(room);

    socket.on('join-room', (requestedRoom) => {
      if (requestedRoom === room) socket.join(room);
    });

    socket.on('chat-message', (payload) => {
      if (
        !payload ||
        payload.room !== room ||
        typeof payload.text !== 'string' ||
        !payload.text.trim() ||
        payload.text.length > 2000
      ) return;

      io.to(room).emit('chat-message', {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: payload.text.trim(),
        sender: socket.data.therapistName,
        createdAt: new Date().toISOString(),
      });
    });

    socket.on('typing', (payload) => {
      if (payload?.room === room) {
        socket.to(room).emit('typing', { sender: socket.data.therapistName });
      }
    });
  });
};
