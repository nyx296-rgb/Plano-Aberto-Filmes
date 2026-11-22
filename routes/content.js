const express = require('express');
const db = require('../db/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

function makeSlug(title) {
  return String(title || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '').replace(/-+$/, '');
}

router.get('/articles', (req, res) => {
  const articles = db.prepare(`
    SELECT * FROM articles 
    WHERE status = 'published' 
    ORDER BY created_at DESC
  `).all();
  res.json(articles);
});

router.get('/articles/:id', (req, res) => {
  const param = req.params.id;
  let article = null;
  
  if (!isNaN(param)) {
    article = db.prepare('SELECT * FROM articles WHERE id = ?').get(param);
  } else {
    // Lookup by stored slug
    const articleBySlug = db.prepare('SELECT * FROM articles WHERE slug = ?').get(param);
    if (articleBySlug) return res.json(articleBySlug);
    
    // Fallback: generate slug from title for backward compatibility
    const allArticles = db.prepare('SELECT * FROM articles').all();
    const foundArticle = allArticles.find(a => {
      const slug = makeSlug(a.title);
      return slug === param;
    });
    article = foundArticle;
  }

  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }
  res.json(article);
});

router.post('/articles', authenticateToken, (req, res) => {
  const { title, content, excerpt, image_url, author, category, status = 'draft' } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title required' });
  }

  const slug = makeSlug(title);

  // Check if slug already exists; append counter if needed
  let finalSlug = slug;
  const existing = db.prepare('SELECT id FROM articles WHERE slug = ?').get(slug);
  if (existing) {
    const base = slug;
    let counter = 1;
    let testSlug = base + '-' + counter;
    while (db.prepare('SELECT id FROM articles WHERE slug = ?').get(testSlug)) {
      counter++;
      testSlug = base + '-' + counter;
    }
    finalSlug = testSlug;
  }

  const result = db.prepare(`
    INSERT INTO articles (title, slug, content, excerpt, image_url, author, category, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, finalSlug, content, excerpt, image_url, author, category, status);

  res.json({ id: result.lastInsertRowid, title, slug: finalSlug, status });
});

router.put('/articles/:id', authenticateToken, (req, res) => {
  const { title, content, excerpt, image_url, author, category, status } = req.body;

  const article = db.prepare('SELECT id FROM articles WHERE id = ?').get(req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  const newSlug = title ? makeSlug(title) : article.slug;

  // Check if new slug already exists for a different article
  let finalSlug = newSlug;
  if (title && newSlug !== article.slug) {
    const existing = db.prepare('SELECT id FROM articles WHERE slug = ? AND id != ?').get(newSlug, article.id);
    if (existing) {
      const base = newSlug;
      let counter = 1;
      while (db.prepare('SELECT id FROM articles WHERE slug = ? AND id != ?').get(finalSlug += '-' + counter, article.id)) {
        counter++;
      }
      finalSlug = base + '-' + counter;
    }
  }

  db.prepare(`
    UPDATE articles 
    SET title = COALESCE(?, title),
        slug = COALESCE(?, slug),
        content = COALESCE(?, content),
        excerpt = COALESCE(?, excerpt),
        image_url = COALESCE(?, image_url),
        author = COALESCE(?, author),
        category = COALESCE(?, category),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, finalSlug, content, excerpt, image_url, author, category, status, req.params.id);

  res.json({ message: 'Article updated', slug: finalSlug });
});

router.delete('/articles/:id', authenticateToken, (req, res) => {
  const result = db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Article not found' });
  }
  res.json({ message: 'Article deleted' });
});

router.get('/videos', (req, res) => {
  const videos = db.prepare(`
    SELECT * FROM videos 
    WHERE status = 'published' 
    ORDER BY created_at DESC
  `).all();
  res.json(videos);
});

router.get('/videos/:id', (req, res) => {
  const param = req.params.id;
  let video = null;
  
  if (!isNaN(param)) {
    video = db.prepare('SELECT * FROM videos WHERE id = ?').get(param);
  } else {
    // Lookup by stored slug
    const video = db.prepare('SELECT * FROM videos WHERE slug = ?').get(param);
    if (video) return res.json(video);
    
    // Fallback: generate slug from title for backward compatibility
    const allVideos = db.prepare('SELECT * FROM videos').all();
    video = allVideos.find(v => {
      const slug = makeSlug(v.title);
      return slug === param;
    });
  }

  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }
  res.json(video);
});

router.post('/videos', authenticateToken, (req, res) => {
  const { title, description, video_url, thumbnail_url, author, category, status = 'draft' } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title required' });
  }

  const slug = makeSlug(title);

  // Check if slug already exists; append counter if needed
  let finalSlug = slug;
  const existing = db.prepare('SELECT id FROM videos WHERE slug = ?').get(slug);
  if (existing) {
    const base = slug;
    let counter = 1;
    let testSlug = base + '-' + counter;
    while (db.prepare('SELECT id FROM videos WHERE slug = ?').get(testSlug)) {
      counter++;
      testSlug = base + '-' + counter;
    }
    finalSlug = testSlug;
  }

  const result = db.prepare(`
    INSERT INTO videos (title, slug, description, video_url, thumbnail_url, author, category, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, finalSlug, description, video_url, thumbnail_url, author, category, status);

  res.json({ id: result.lastInsertRowid, title, slug: finalSlug, status });
});

router.put('/videos/:id', authenticateToken, (req, res) => {
  const { title, description, video_url, thumbnail_url, author, category, status } = req.body;

  const video = db.prepare('SELECT id FROM videos WHERE id = ?').get(req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const newSlug = title ? makeSlug(title) : video.slug;

  // Check if new slug already exists for a different video
  let finalSlug = newSlug;
  if (title && newSlug !== video.slug) {
    const existing = db.prepare('SELECT id FROM videos WHERE slug = ? AND id != ?').get(newSlug, video.id);
    if (existing) {
      const base = newSlug;
      let counter = 1;
      while (db.prepare('SELECT id FROM videos WHERE slug = ? AND id != ?').get(finalSlug += '-' + counter, video.id)) {
        counter++;
      }
      finalSlug = base + '-' + counter;
    }
  }

  db.prepare(`
    UPDATE videos 
    SET title = COALESCE(?, title),
        slug = COALESCE(?, slug),
        description = COALESCE(?, description),
        video_url = COALESCE(?, video_url),
        thumbnail_url = COALESCE(?, thumbnail_url),
        author = COALESCE(?, author),
        category = COALESCE(?, category),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, finalSlug, description, video_url, thumbnail_url, author, category, status, req.params.id);

  res.json({ message: 'Video updated', slug: finalSlug });
});

router.delete('/videos/:id', authenticateToken, (req, res) => {
  const result = db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Video not found' });
  }
  res.json({ message: 'Video deleted' });
});

// Admin: listar todo o conteúdo (incluindo rascunhos)
router.get('/admin/articles', authenticateToken, (req, res) => {
  const articles = db.prepare('SELECT * FROM articles ORDER BY created_at DESC').all();
  res.json(articles);
});

router.get('/admin/videos', authenticateToken, (req, res) => {
  const videos = db.prepare('SELECT * FROM videos ORDER BY created_at DESC').all();
  res.json(videos);
});

router.get('/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.json(categories);
});

router.post('/categories', authenticateToken, (req, res) => {
  const { name, slug, type } = req.body;

  if (!name || !slug || !type) {
    return res.status(400).json({ error: 'Name, slug, and type required' });
  }

  const result = db.prepare('INSERT INTO categories (name, slug, type) VALUES (?, ?, ?)').run(name, slug, type);
  res.json({ id: result.lastInsertRowid, name, slug, type });
});

module.exports = router;