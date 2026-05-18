require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { connectDB, connectRedis } = require('./config/db');

const app = express();
const server = http.createServer(app);

// Configure permit CORS policies for frontend connectivity on Port 3000 and 3001
const corsOptions = {
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Set up dynamic health checks for python script wait verification
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date() });
});

// Mount Routes
app.use('/api/feed', require('./routes/feed.routes'));

// Fallback Route
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint Not Found' });
});

// Configure Socket.IO Server with same CORS policy
const io = socketIo(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Make Socket.IO globally available inside controller instances
app.set('io', io);

// Handle realtime connections
io.on('connection', (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`);
  
  // Custom check-in event to confirm connection
  socket.emit('connection:ack', { message: 'Successfully established gateway connection', socketId: socket.id });

  socket.on('disconnect', (reason) => {
    console.log(`[SOCKET] Client disconnected: ${socket.id}. Reason: ${reason}`);
  });
});

const PORT = process.env.PORT || 5000;

// Initialize Database & Cache, then launch Server
const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();
    
    server.listen(PORT, () => {
      console.log(`==============================================`);
      console.log(`⚡ Express Server actively listening on Port ${PORT}`);
      console.log(`📡 WebSocket Gateway running concurrently`);
      console.log(`==============================================`);
    });
  } catch (error) {
    console.error(`[CRITICAL] Server startup failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();
