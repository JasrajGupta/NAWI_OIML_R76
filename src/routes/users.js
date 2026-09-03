const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/users — list all users (admin only)
router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, full_name, role, lab_code, status, last_login, created_at FROM users ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users — create user (admin only)
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { username, password, full_name, role, lab_code } = req.body;
    if (!username || !full_name || !role) {
      return res.status(400).json({ error: 'Username, full name, and role are required' });
    }
    const hash = await bcrypt.hash(password || 'password123', 10);
    await pool.query(
      'INSERT INTO users (username, password_hash, full_name, role, lab_code) VALUES (?,?,?,?,?)',
      [username, hash, full_name, role, lab_code || 'NML-IND-001']
    );
    res.status(201).json({ message: 'User created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username already exists' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

module.exports = router;