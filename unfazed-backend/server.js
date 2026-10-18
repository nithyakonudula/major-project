require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const attachChatSocket = require('./src/sockets/chatSocket');

const jwtSecret = process.env.JWT_SECRET;
if (
  !jwtSecret ||
  jwtSecret.length < 32 ||
  jwtSecret === 'replace_with_a_long_random_secret'
) {
  throw new Error('Set JWT_SECRET in .env to a unique secret of at least 32 characters.');
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});
attachChatSocket(io);
app.set('io', io);

const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port.');
}

connectDB()
  .then(() => {
    server.listen(port, () => {
      console.log(`Unfazed API running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Startup failed:', error.message);
    process.exit(1);
  });
