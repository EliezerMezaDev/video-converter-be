const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const convertRoutes = require('./routes/convert.routes');

const app = express();
const server = http.createServer(app);

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket] ✅ Client connected     | id=${socket.id} | origin=${socket.handshake.headers.origin || 'unknown'}`);

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] ❌ Client disconnected  | id=${socket.id} | reason=${reason}`);
  });
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*'
}));

app.use(express.json());

// Pass io instance to request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Ensure directories exist
const rawDir = path.join(__dirname, '../uploads/raw');
const processedDir = path.join(__dirname, '../uploads/processed');

if (!fs.existsSync(rawDir)) {
  fs.mkdirSync(rawDir, { recursive: true });
}
if (!fs.existsSync(processedDir)) {
  fs.mkdirSync(processedDir, { recursive: true });
}

// Routes
app.use('/api/convert', convertRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`[Server] 🚀 Running on http://localhost:${PORT}`);
  console.log(`[Server] 📡 Socket.io accepting connections from: ${process.env.FRONTEND_URL || '*'}`);
});
