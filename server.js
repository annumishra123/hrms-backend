require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const initializeSocket = require("./src/socket/socket");
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);


const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

initializeSocket(io);

app.set("io", io);
// Socket Connection
io.on('connection', (socket) => {
  console.log('🟢 User Connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔴 User Disconnected:', socket.id);
  });
});

// Database connect + Server Start
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(
      `🚀 HRMS Backend running in ${
        process.env.NODE_ENV || 'development'
      } mode on port ${PORT}`
    );

    console.log(
      `📄 Swagger API docs available at: ${
        process.env.BASE_URL || `http://localhost:${PORT}`
      }/api-docs`
    );
  });
});

// Safety nets
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
});

process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
});