import cors from 'cors';
import express from 'express';
import config from './config.js';
import authRoutes from './routes/auth.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Mobile backend is healthy' });
});

app.use('/api/auth', authRoutes);

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

app.listen(config.port, () => {
  console.log(`Mobile backend listening on port ${config.port}`);
});
