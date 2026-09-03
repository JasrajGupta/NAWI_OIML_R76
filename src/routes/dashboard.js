const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const [total] = await pool.query('SELECT COUNT(*) as count FROM applications');
    const [passed] = await pool.query("SELECT COUNT(*) as count FROM applications WHERE status = 'approved'");
    const [failed] = await pool.query("SELECT COUNT(*) as count FROM applications WHERE status = 'rejected'");
    const [inProgress] = await pool.query("SELECT COUNT(*) as count FROM applications WHERE status IN ('draft','submitted','under_review')");
    const [recent] = await pool.query(
      'SELECT id, manufacturer, model, accuracy_class, status, created_at FROM applications ORDER BY created_at DESC LIMIT 10'
    );

    res.json({
      total: total[0].count,
      passed: passed[0].count,
      failed: failed[0].count,
      inProgress: inProgress[0].count,
      recent: recent
    });
  } catch (err) {
    console.error('[DASH] Stats error:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

module.exports = router;