import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { app } from './app';
import { config } from './config';
import { initFirebase } from './config/firebase';
import { UserModel } from './models';
import { seedDatabase } from './scripts/seed';

const server = http.createServer(app);

// Initialize Socket.IO with CORS
export const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('join_branch', (branchId) => {
    socket.join(`branch_${branchId}`);
    console.log(`[Socket.IO] Client ${socket.id} joined branch_${branchId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

async function startServer() {
  try {
    console.log(`[Database] Connecting to Google Firebase (Cloud Firestore)...`);
    const { isMock } = initFirebase();
    if (isMock) {
      console.log('[Database] Running in local offline/mock Firestore mode.');
    } else {
      console.log('[Database] Firebase Cloud Firestore connected successfully.');
    }

    // Auto-seed if database is empty so login always works out of the box
    try {
      const userCount = await UserModel.countDocuments();
      if (userCount === 0) {
        console.log('[Server] Database is empty. Auto-seeding initial admin, staff users and catalog...');
        await seedDatabase();
      }
    } catch (err: any) {
      console.warn('[Server] Auto-seed check notice:', err.message);
    }

    server.listen(config.port, () => {
      console.log(`=======================================================`);
      console.log(`  TRENDING STUDIO — POS & BUSINESS API`);
      console.log(`  Database: Google Firebase Cloud Firestore`);
      console.log(`  Karaikudi - 630001 | Phone: +91-79040-64446`);
      console.log(`  Server running on port: ${config.port}`);
      console.log(`  Environment: ${config.nodeEnv}`);
      console.log(`  Healthcheck: http://localhost:${config.port}/api/v1/health`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('[Server] Failed to connect to Firebase or start server:', error);
    if (process.env.NODE_ENV !== 'test') {
      server.listen(config.port, () => {
        console.log(`[Server] Running in standalone fallback mode on port ${config.port}`);
      });
    }
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { server };
