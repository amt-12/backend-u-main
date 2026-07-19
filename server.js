const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db.js");
const routes = require("./routes");
const { startReminderCron } = require('./services/reminderService'); // Reminder cron
const { initWhatsApp } = require('./services/whatsappService');

dotenv.config({ path: './.env' });



connectDB();
initWhatsApp();

const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:8080",
      "http://localhost:8081",
      "http://localhost:8082",
      "http://localhost:8094",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://unrealstudiozz.com",
      "https://test.unrealstudiozz.com",
      "https://admin.unrealstudiozz.com",
    ];
console.log("CORS:", process.env.CORS);
console.log("JWT:", process.env.JWT_SECRET);

    if (allowedOrigins.includes(origin)) return callback(null, true);

    const envAllowed = process.env.CORS;
    if (envAllowed && origin === envAllowed) return callback(null, true);

    return callback(null, false);
  },
  credentials: true
}));


app.use(routes);

app.get("/", (req, res) => {
  res.send("Unreal Running !!");
});

const server = http.createServer(app);

io = socketIo(server, {
  cors: {
    origin: process.env.CORS,
    credentials: true
  }
});

global.io = io;

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Authentication error'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.userId);
  socket.join(`user_${socket.userId}`);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.userId);
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  const { stopReminderCron } = require('./services/reminderService');
  stopReminderCron();
  process.exit(0);
});

const PORT = process.env.PORT || 5002;

server.listen(PORT, () => {
  console.log(`🚀 Server + Socket.IO running on port ${PORT}`);
  startReminderCron();
});

