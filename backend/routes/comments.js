const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/comments/:articleId - list comments for an article
router.get('/:articleId', async (req, res) => {
  try {
    const [comments] = await pool.query(
      'SELECT * FROM comments WHERE article_id = ? ORDER BY created_at ASC',
      [req.params.articleId]
    );
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/comments/:articleId - add a comment (no login required for readers)
router.post('/:articleId', async (req, res) => {
  try {
    const { user_name, content } = req.body;
    if (!user_name || !content) {
      return res.status(400).json({ error: 'user_name and content are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO comments (article_id, user_name, content) VALUES (?, ?, ?)',
      [req.params.articleId, user_name, content]
    );
    res.status(201).json({ id: result.insertId, user_name, content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

module.exports = router;
