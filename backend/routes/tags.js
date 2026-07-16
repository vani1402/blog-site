const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/tags - list all tags
router.get('/', async (req, res) => {
  try {
    const [tags] = await pool.query('SELECT * FROM tags ORDER BY name');
    res.json(tags);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

module.exports = router;
