require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PORT, FRONTEND_URL } = require('./config/env');

// Import routes
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');

const app = express();

// CORS configuration
app.use(cors({
  origin: [
    'http://127.0.0.1:8080',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://localhost:3000',
    FRONTEND_URL
  ],
  credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Sunucu hatası' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Mel'z Baby Backend API running on port ${PORT}`);
  console.log(`   Health: http://127.0.0.1:${PORT}/api/health`);
  console.log(`   CORS enabled for: ${FRONTEND_URL}\n`);
});
