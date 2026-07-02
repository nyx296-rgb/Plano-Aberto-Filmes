const express = require('express');
const db = require('../db/database');

const router = express.Router();

// Simple TRPC Batch Handler
router.all('/:procedures', (req, res) => {
  const procedures = req.params.procedures.split(',');
  const results = procedures.map(proc => {
    let data = null;
    
    if (proc === 'articles.list') {
      data = db.prepare("SELECT * FROM articles WHERE status = 'published' ORDER BY created_at DESC").all();
    } else if (proc === 'videos.list') {
      data = db.prepare("SELECT * FROM videos WHERE status = 'published' ORDER BY created_at DESC").all();
    } else if (proc === 'articles.get') {
        let id = null;
        try { id = req.query.input ? JSON.parse(req.query.input).id : null; } catch(e) { id = null; }
        data = id ? db.prepare("SELECT * FROM articles WHERE id = ?").get(id) : null;
    } else if (proc === 'videos.get') {
        let id = null;
        try { id = req.query.input ? JSON.parse(req.query.input).id : null; } catch(e) { id = null; }
        data = id ? db.prepare("SELECT * FROM videos WHERE id = ?").get(id) : null;
    }

    // Ensure all items have a slug (TRPC client expects it) and camelCase fields
    const mapItem = (item) => ({
        id: item.id,
        title: item.title,
        description: item.content || item.description || null,
        excerpt: item.excerpt || null,
        author: item.author,
        category: item.category,
        status: item.status,
        createdAt: item.created_at,
        imageUrl: item.image_url || null,
        youtubeUrl: item.video_url || null,
        thumbnailUrl: item.thumbnail_url || null,
        slug: item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    });

    if (Array.isArray(data)) {
        if (proc.startsWith('articles')) {
            data = data.map(item => ({ article: mapItem(item) }));
        } else if (proc.startsWith('videos')) {
            data = data.map(item => ({ video: mapItem(item) }));
        } else {
            data = data.map(mapItem);
        }
    } else if (data) {
        if (proc.startsWith('articles')) {
            data = { article: mapItem(data) };
        } else if (proc.startsWith('videos')) {
            data = { video: mapItem(data) };
        } else {
            data = mapItem(data);
        }
    }

    return {
      result: {
        data: {
          json: data,
          meta: {}
        }
      }
    };
  });

  if (req.query.batch) {
    const batchResponse = {};
    results.forEach((res, index) => {
      batchResponse[index] = res;
    });
    res.json(batchResponse);
  } else {
    res.json(results[0]);
  }
});

module.exports = router;
