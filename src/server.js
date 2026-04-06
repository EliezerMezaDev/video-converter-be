const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Registry: socketId -> Set of output filenames pending cleanup
const fileRegistry = new Map();

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

  // Initialize an empty file set for this socket
  fileRegistry.set(socket.id, new Set());

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] ❌ Client disconnected  | id=${socket.id} | reason=${reason}`);

    // Delete any converted files that were never downloaded
    const pendingFiles = fileRegistry.get(socket.id);
    if (pendingFiles && pendingFiles.size > 0) {
      console.log(`[Cleanup] 🧹 Socket gone — purging ${pendingFiles.size} unconverted file(s) for id=${socket.id}`);
      for (const filename of pendingFiles) {
        const filePath = path.join(processedDir, filename);
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

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*'
}));

app.use(express.json());

// Pass io instance and file registry to every request
app.use((req, res, next) => {
  req.io = io;
  req.fileRegistry = fileRegistry;
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
  console.log(`[Server] 🚀 Running`);
  console.log(`[Server] 📡 Socket.io accepting connections from: ${process.env.FRONTEND_URL || '*'}`);
  console.log(`[Server] ⚙️  Features: ${JSON.stringify(require('./config/features'))}`);
});
