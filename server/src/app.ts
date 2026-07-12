import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

import { connectDatabase } from './config/db';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import { setupSocketHandlers } from './socket';
import { startCleanupService } from './services/cleanup.service';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ─── Middleware ──────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// ─── Routes ─────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Socket.IO ──────────────────────────────────────────────────
setupSocketHandlers(io);

// ─── Start Server ───────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);

async function start(): Promise<void> {
  try {
    await connectDatabase();
    startCleanupService();

    server.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════╗
║          🔒 NullChat Server             ║
║──────────────────────────────────────────║
║  Port:      ${PORT}                        ║
║  Mode:      ${process.env.NODE_ENV || 'development'}                ║
║  MongoDB:   Connected                    ║
║  WebSocket: Active                       ║
╚══════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
