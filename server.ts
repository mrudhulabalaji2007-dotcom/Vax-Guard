import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB } from './server/config/db.js';
import { seedDatabase } from './server/services/seedData.js';
import apiRouter from './server/routes/api.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint (immediate 200 response)
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      application: 'VAXGUARD Smart Vaccine Cold-Chain Management System',
      stack: 'MERN + Firebase + Gemini AI',
      timestamp: new Date(),
    });
  });

  // Mount REST API
  app.use('/api', apiRouter);

  // Guarantee that all /api/* routes return JSON and never fall through to Vite SPA index.html
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      message: `API endpoint ${req.method} ${req.originalUrl} not found`,
    });
  });

  // Serve Frontend with Vite Middleware in Development
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('⚡ Vite dev middleware attached to Express server');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start HTTP Server on port 3000 immediately
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 VAXGUARD MERN Cold-Chain Server running on port ${PORT}`);
    console.log(`📡 REST API endpoint: http://0.0.0.0:${PORT}/api`);
    console.log(`====================================================`);
  });

  // Initialize DB and Seed Data in parallel / non-blocking
  connectDB()
    .then(() => seedDatabase())
    .then(() => {
      console.log('✨ Cold-chain database fully synchronized.');
    })
    .catch((err) => {
      console.warn('⚠️ Non-fatal DB init notice:', err);
    });

  return server;
}

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
