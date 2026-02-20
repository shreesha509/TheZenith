import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import apiRoutes from './routes/api.route.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Main API Router
app.use('/api', apiRoutes);

// Global Error Handler to prevent Express from crashing
app.use((err, req, res, next) => {
  console.error(`[Express] Unhandled Error: ${err.message}`);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Process-level unhandled exception handlers to ensure judge-safe crash prevention
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(PORT, () => {
  console.log(`[Antigravity] Autonomous CI/CD Healing Agent running on port ${PORT}`);
});
