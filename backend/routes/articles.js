const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/articles - list all published articles (optionally filter by tag)
router.get('/', async (req, res) => {
  try {
    const { tag } = req.query;
    let query = `
      SELECT DISTINCT a.id, a.title, a.content, a.status, a.author_id, a.created_at,
             u.name AS author_name
      FROM articles a
      JOIN users u ON a.author_id = u.id
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE a.status = 'published'
    `;
    const params = [];
    if (tag) {
      query += ' AND t.name = ?';
      params.push(tag);
    }
    query += ' ORDER BY a.created_at DESC';

    const [articles] = await pool.query(query, params);
    res.json(articles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// GET /api/articles/mine - author's own articles (draft + published)
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const [articles] = await pool.query(
      'SELECT * FROM articles WHERE author_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(articles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch your articles' });
  }
});

// GET /api/articles/:id - single article with tags
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, u.name AS author_name FROM articles a
       JOIN users u ON a.author_id = u.id WHERE a.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Article not found' });

    const [tags] = await pool.query(
      `SELECT t.name FROM tags t
       JOIN article_tags at ON t.id = at.tag_id
       WHERE at.article_id = ?`,
      [req.params.id]
    );

    res.json({ ...rows[0], tags: tags.map(t => t.name) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// POST /api/articles - create new article (author only)
router.post('/', authMiddleware, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { title, content, status, tags } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO articles (title, content, status, author_id) VALUES (?, ?, ?, ?)',
      [title, content, status || 'draft', req.user.id]
    );
    const articleId = result.insertId;

    if (Array.isArray(tags)) {
      for (const tagName of tags) {
        await conn.query('INSERT IGNORE INTO tags (name) VALUES (?)', [tagName]);
        const [[tagRow]] = await conn.query('SELECT id FROM tags WHERE name = ?', [tagName]);
        await conn.query('INSERT IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)', [
          articleId,
          tagRow.id
        ]);
      }
    }

    await conn.commit();
    res.status(201).json({ id: articleId, title, content, status: status || 'draft' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to create article' });
  } finally {
    conn.release();
  }
});

// PUT /api/articles/:id - edit article (author only, own articles)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, content, status } = req.body;
    const [rows] = await pool.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Article not found' });
    if (rows[0].author_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this article' });
    }

    await pool.query(
      'UPDATE articles SET title = ?, content = ?, status = ? WHERE id = ?',
      [title || rows[0].title, content || rows[0].content, status || rows[0].status, req.params.id]
    );
    res.json({ message: 'Article updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// DELETE /api/articles/:id - delete article (author only, own articles)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Article not found' });
    if (rows[0].author_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this article' });
    }

    await pool.query('DELETE FROM articles WHERE id = ?', [req.params.id]);
    res.json({ message: 'Article deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

module.exports = router;
