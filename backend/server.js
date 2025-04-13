import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import foodPostRoutes from './routes/foodPostRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
// Admin setup routes removed for security
import setupSocketIO from './socket/socketHandler.js';

dotenv.config();
const app = express();
const httpServer = createServer(app);

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());

// CORS Configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Allow specific origins
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept']
}));

// Pre-flight requests
app.options('*', cors());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/food-posts', foodPostRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/reports', reportRoutes);
// Admin setup routes removed for security

// Start server
const startServer = async () => {
  try {
    // Try to start the server on the default port
    const defaultPort = process.env.PORT || 5003;
    let server;
    
    try {
      server = httpServer.listen(defaultPort, () => {
        console.log(`Server running on port ${defaultPort}`);
      });
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${defaultPort} is already in use, trying alternative ports...`);
        
        // Try alternative ports
        let port = defaultPort + 1;
        let maxAttempts = 10;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
          try {
            server = httpServer.listen(port, () => {
              console.log(`Server running on alternative port ${port}`);
              // Update environment variable for the frontend to use
              process.env.PORT = port;
            });
            break;
          } catch (err) {
            if (err.code === 'EADDRINUSE') {
              port++;
              attempts++;
            } else {
              throw err;
            }
          }
        }
        
        if (attempts >= maxAttempts) {
          throw new Error(`Could not find an available port after ${maxAttempts} attempts`);
        }
      } else {
        throw err;
      }
    }
    
    // Initialize Socket.IO with the server
    const io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      connectTimeout: 45000,
      transports: ['websocket', 'polling'],
      allowEIO3: true,
      maxHttpBufferSize: 100 * 1024 * 1024 // 100 MB
    });

    // Add connection timeout handling
    io.engine.on("connection_error", (err) => {
      console.error('Socket.IO connection error:', {
        type: err.type,
        message: err.message,
        context: err.context
      });
    });

    // Make io accessible to routes
    app.set('io', io);
    
    // Setup socket handler
    setupSocketIO(io);
    
    return server;
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();