const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`  ${timestamp} ${req.method} ${req.path}`);
  next();
});

// ============================================================
// STATIC FILES — serve the frontend
// ============================================================
app.use(express.static(path.join(__dirname, '..', 'public')));

// SPA fallback — any non-API route returns index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ============================================================
// API ROUTES
// ============================================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/users', require('./routes/users'));
app.use('/api/dashboard', require('./routes/dashboard'));

// 404 for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found: ' + req.path });
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║   NAWI OIML R-76 Test Report Generator          ║');
  console.log('  ║   Department of Consumer Affairs                ║');
  console.log('  ╠══════════════════════════════════════════════════╣');
  console.log(`  ║   Server:  http://localhost:${PORT}                ║`);
  console.log('  ║   API:     http://localhost:' + PORT + '/api             ║');
  console.log('  ║   Status:  Running                              ║');
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log('');
});