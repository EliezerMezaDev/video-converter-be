const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ── Modules ──────────────────────────────────────────────────────────────────
const videoFormatConverterRoute = require('./modules/video-format-converter/video-format-converter.route');
const { PROCESSED_DIR } = require('./modules/video-format-converter/video-format-converter.service');
const musicSearchRoute = require('./modules/music-search/music-search.route');

// ── App setup ─────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

// Registry: socketId → Set of output filenames pending cleanup
const fileRegistry = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket] ✅ Client connected     | id=${socket.id} | origin=${socket.handshake.headers.origin || 'unknown'}`);

  fileRegistry.set(socket.id, new Set());

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] ❌ Client disconnected  | id=${socket.id} | reason=${reason}`);

    const pendingFiles = fileRegistry.get(socket.id);
    if (pendingFiles && pendingFiles.size > 0) {
      console.log(`[Cleanup] 🧹 Socket gone — purging ${pendingFiles.size} undownloaded file(s) for id=${socket.id}`);
      for (const filename of pendingFiles) {
        const filePath = path.join(PROCESSED_DIR, filename);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[Cleanup] 🗑️  Deleted on disconnect: ${filename}`);
          }
        } catch (err) {
          console.error(`[Cleanup] ❌ Error deleting ${filename}:`, err.message);
        }
      }
    }

    fileRegistry.delete(socket.id);
  });
});

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Inject io + fileRegistry into every request
app.use((req, res, next) => {
  req.io = io;
  req.fileRegistry = fileRegistry;
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/convert',    videoFormatConverterRoute);
app.use('/api/v1/music',   musicSearchRoute);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`[Server] 🚀 Running on port ${PORT}`);
  console.log(`[Server] 📡 Socket.io accepting connections from: ${process.env.FRONTEND_URL || '*'}`);
  console.log(`[Server] ⚙️  Features: ${JSON.stringify(require('./config/features'))}`);
});
