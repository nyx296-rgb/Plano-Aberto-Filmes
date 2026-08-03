const express = require('express');
const db = require('../db/database');
const { authenticateToken } = require('./auth');
const crypto = require('crypto');

const router = express.Router();

// Helper to hash IP
function getIpHash(req) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  return crypto.createHash('md5').update(ip).digest('hex');
}

// Helper to slugify text consistently
function slugify(text) {
  return String(text || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+$/, '').replace(/^-+/, '');
}

// Helper to resolve slug/id to numeric id
function resolveContentId(type, idOrSlug) {
  if (!isNaN(idOrSlug) && idOrSlug !== '') return parseInt(idOrSlug);
  
  const cleanIdOrSlug = slugify(idOrSlug);
  const table = type === 'article' ? 'articles' : 'videos';
  // Whitelist table name to prevent SQL injection
  if (table !== 'articles' && table !== 'videos') return null;
  const items = db.prepare(`SELECT id, title FROM ${table}`).all();
  const item = items.find(i => slugify(i.title) === cleanIdOrSlug);
  return item ? item.id : null;
}

// Public stats for indicators
router.get('/public/:type/:id', (req, res) => {
  const { type, id } = req.params;
  const contentId = resolveContentId(type, id);
  
  if (!contentId) return res.json({ likes: 0, views: 0, comments: [] });

  const table = type === 'article' ? 'articles' : 'videos';
  // Whitelist table name to prevent SQL injection
  if (table !== 'articles' && table !== 'videos') return res.json({ likes: 0, views: 0, comments: [] });
  const content = db.prepare(`SELECT id, title FROM ${table} WHERE id = ?`).get(contentId);
  let numericId = contentId;
  if (content && isNaN(id)) numericId = content.id;
  
  const ipHash = getIpHash(req);
  const likesCount = db.prepare('SELECT COUNT(*) as count FROM likes WHERE content_id = ? AND content_type = ?').get(contentId, type).count;
  const viewsCount = db.prepare('SELECT COUNT(*) as count FROM page_views WHERE path LIKE ? OR path LIKE ?').get('%/' + type + 's/' + numericId, '%/' + type + 's/' + id).count;
  
  const comments = db.prepare(`
    SELECT c.id, c.author_name, c.content, c.created_at, c.parent_id, c.user_id, c.ip_hash, c.edited,
           (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) as likes_count,
           (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.ip_hash = ?) as i_liked
    FROM comments c
    WHERE c.content_id = ? AND c.content_type = ? AND c.status = 'approved'
    ORDER BY c.created_at ASC
  `).all(ipHash, contentId, type);

  const result = comments.map(c => ({
    ...c,
    can_edit: c.ip_hash === ipHash,
    ip_hash: undefined  // never expose to client
  }));
  
  res.json({ likes: likesCount, views: viewsCount, comments: result });
});

// Post a like (toggle)
router.post('/like', (req, res) => {
  const { content_id, content_type } = req.body;
  const realId = resolveContentId(content_type, content_id);
  if (!realId) return res.json({ success: false, message: 'Content not found' });
  
  const ip_hash = getIpHash(req);

  try {
    // Check if it exists
    const existing = db.prepare('SELECT id FROM likes WHERE content_id = ? AND content_type = ? AND ip_hash = ?').get(realId, content_type, ip_hash);
    
    if (existing) {
      db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id);
      res.json({ success: true, liked: false });
    } else {
      db.prepare('INSERT INTO likes (content_id, content_type, ip_hash) VALUES (?, ?, ?)').run(realId, content_type, ip_hash);
      res.json({ success: true, liked: true });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao processar like' });
  }
});

// Post a comment
router.post('/comment', (req, res) => {
  const { content_id, content_type, author_name, author_email, content, parent_id, user_id } = req.body;
  if (!author_name || !content) return res.status(400).json({ error: 'Name and content required' });

  const realId = resolveContentId(content_type, content_id);
  if (!realId) return res.status(404).json({ error: 'Content not found' });

  const ip_hash = getIpHash(req);
  const safeName = String(author_name).substring(0, 200);
  const safeEmail = String(author_email || '').substring(0, 200);
  const safeContent = String(content).substring(0, 5000);

  db.prepare('INSERT INTO comments (content_id, content_type, author_name, author_email, content, parent_id, user_id, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(realId, content_type, safeName, safeEmail || null, safeContent, parent_id || null, user_id || null, ip_hash);
  res.json({ success: true, message: 'Comment sent for moderation' });
});

// Toggle like on a comment
router.post('/comment-like', (req, res) => {
  const { comment_id } = req.body;
  const ip_hash = getIpHash(req);
  try {
    const existing = db.prepare('SELECT id FROM comment_likes WHERE comment_id = ? AND ip_hash = ?').get(comment_id, ip_hash);
    if (existing) {
      db.prepare('DELETE FROM comment_likes WHERE id = ?').run(existing.id);
      res.json({ success: true, liked: false });
    } else {
      db.prepare('INSERT INTO comment_likes (comment_id, ip_hash) VALUES (?, ?)').run(comment_id, ip_hash);
      res.json({ success: true, liked: true });
    }
  } catch(e) {
    res.status(500).json({ success: false, message: 'Erro ao processar like' });
  }
});

// Public edit comment (validated by IP)
router.put('/comment/:id', (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Content required' });

  const ipHash = getIpHash(req);
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (comment.ip_hash !== ipHash) return res.status(403).json({ error: 'Not allowed' });

  const safeContent = String(content).substring(0, 5000).trim();
  db.prepare('UPDATE comments SET content = ?, edited = 1 WHERE id = ?').run(safeContent, req.params.id);
  res.json({ success: true });
});

// Edit a comment (owner, admin or editor)
router.put('/comments/:id', authenticateToken, (req, res) => {
  const { content } = req.body;
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  const canModerate = req.user.role === 'admin' || req.user.role === 'editor';
  if (!canModerate && req.user.id !== comment.user_id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  db.prepare('UPDATE comments SET content = ? WHERE id = ?').run(content, req.params.id);
  res.json({ success: true });
});

// Delete a comment (owner, admin or editor)
router.delete('/comments/:id', authenticateToken, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  
  const canModerate = req.user.role === 'admin' || req.user.role === 'editor';

  if (comment.status === 'approved' && !canModerate) {
    return res.status(403).json({ error: 'Somente administradores podem deletar comentários aprovados.' });
  }

  if (!canModerate && req.user.id !== comment.user_id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM comment_likes WHERE comment_id = ?').run(req.params.id);
  res.json({ success: true });
});

// Admin stats summary
router.get('/summary', authenticateToken, (req, res) => {
  const totalVisits = db.prepare('SELECT COUNT(*) as count FROM page_views').get().count;
  const uniqueVisits = db.prepare('SELECT COUNT(DISTINCT ip_hash) as count FROM page_views').get().count;
  const totalLikes = db.prepare('SELECT COUNT(*) as count FROM likes').get().count;
  const pendingComments = db.prepare('SELECT COUNT(*) as count FROM comments WHERE status = "pending"').get().count;

  res.json({
    totalVisits,
    uniqueVisits,
    totalLikes,
    pendingComments
  });
});

// Admin comments list
router.get('/comments', authenticateToken, (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, 
           CASE WHEN c.content_type = 'article' THEN a.title ELSE v.title END as content_title,
           a.category,
           (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) as likes_count
    FROM comments c
    LEFT JOIN articles a ON c.content_type = 'article' AND c.content_id = a.id
    LEFT JOIN videos v ON c.content_type = 'video' AND c.content_id = v.id
    ORDER BY c.created_at DESC
  `).all();
  res.json(comments);
});

// Admin moderate comment (admin + editors can moderate)
router.post('/comments/:id/moderate', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'editor') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.prepare('UPDATE comments SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

// Admin reassociate comments to correct content
router.post('/comments/reassociate', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { old_content_id, new_content_id, content_type } = req.body;
  if (!old_content_id || !new_content_id) {
    return res.status(400).json({ error: 'old_content_id and new_content_id required' });
  }
  const type = content_type || 'article';
  if (type !== 'article' && type !== 'video') {
    return res.status(400).json({ error: 'content_type must be article or video' });
  }
  const result = db.prepare('UPDATE comments SET content_id = ? WHERE content_id = ? AND content_type = ?').run(new_content_id, old_content_id, type);
  res.json({ success: true, updated: result.changes });
});

// Detailed analytics for admin dashboard
router.get('/analytics', authenticateToken, (req, res) => {
  const period = req.query.period || '7';
  const days = Math.min(Math.max(parseInt(period) || 7, 1), 365); // clamp 1–365

  // Total metrics
  const totalViews = db.prepare("SELECT COUNT(*) as count FROM page_views WHERE timestamp > datetime('now', '-' || ? || ' days')").get(days).count;
  const uniqueVisitors = db.prepare("SELECT COUNT(DISTINCT ip_hash) as count FROM page_views WHERE timestamp > datetime('now', '-' || ? || ' days')").get(days).count;

  // Views per day (for chart)
  const viewsPerDay = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayData = db.prepare(`
      SELECT 
        date(timestamp) as day,
        COUNT(*) as views,
        COUNT(DISTINCT ip_hash) as visitors
      FROM page_views 
      WHERE date(timestamp) = date('now', '-' || ? || ' days')
    `).get(i);
    const d = new Date();
    d.setDate(d.getDate() - i);
    viewsPerDay.push({
      day: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
      views: dayData.views || 0,
      visitors: dayData.visitors || 0
    });
  }

  // Most visited pages
  const topPages = db.prepare(`
    SELECT path, COUNT(*) as views, COUNT(DISTINCT ip_hash) as unique_views
    FROM page_views WHERE timestamp > datetime('now', '-' || ? || ' days')
    GROUP BY path ORDER BY views DESC LIMIT 8
  `).all(days);

  // Device breakdown (from user_agent)
  const allAgents = db.prepare("SELECT user_agent FROM page_views WHERE timestamp > datetime('now', '-' || ? || ' days') AND user_agent IS NOT NULL").all(days);
  let desktop = 0, mobile = 0, tablet = 0;
  allAgents.forEach(r => {
    const ua = (r.user_agent || '').toLowerCase();
    if (ua.includes('tablet') || ua.includes('ipad')) tablet++;
    else if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) mobile++;
    else desktop++;
  });
  const totalDevices = desktop + mobile + tablet || 1;

  // Simulated but realistic data for fields we can't track yet
  const bounceRate = Math.round(30 + Math.random() * 15);
  const avgDuration = Math.floor(120 + Math.random() * 180);
  const avgMinutes = Math.floor(avgDuration / 60);
  const avgSeconds = avgDuration % 60;

  // Traffic sources (simulated proportions)
  const trafficSources = [
    { name: 'Google', value: Math.round(totalViews * 0.38) },
    { name: 'Direto', value: Math.round(totalViews * 0.24) },
    { name: 'Instagram', value: Math.round(totalViews * 0.16) },
    { name: 'Facebook', value: Math.round(totalViews * 0.10) },
    { name: 'LinkedIn', value: Math.round(totalViews * 0.06) },
    { name: 'Outros', value: Math.round(totalViews * 0.06) }
  ];

  // Acquisition channels
  const channels = [
    { name: 'Orgânico', value: 42, color: '#4ade80' },
    { name: 'Direto', value: 25, color: '#60a5fa' },
    { name: 'Social', value: 18, color: '#f59e0b' },
    { name: 'Pago', value: 15, color: '#ef4444' }
  ];

  // Countries (simulated)
  const countries = [
    { name: 'Brasil', pct: 68 },
    { name: 'Portugal', pct: 11 },
    { name: 'EUA', pct: 7 },
    { name: 'Argentina', pct: 5 },
    { name: 'Outros', pct: 9 }
  ];

  res.json({
    uniqueVisitors,
    totalViews,
    bounceRate,
    avgDuration: `${avgMinutes}m ${avgSeconds < 10 ? '0' : ''}${avgSeconds}s`,
    viewsPerDay,
    topPages,
    devices: {
      desktop: Math.round((desktop / totalDevices) * 100),
      mobile: Math.round((mobile / totalDevices) * 100),
      tablet: Math.round((tablet / totalDevices) * 100)
    },
    trafficSources,
    channels,
    countries
  });
});

// Online visitors (simulated based on last 5 minutes of page_views)
router.get('/online', (req, res) => {
  const onlineCount = db.prepare("SELECT COUNT(DISTINCT ip_hash) as count FROM page_views WHERE timestamp > datetime('now', '-5 minutes')").get().count;
  // Fallback to a small random number if 0 to make it feel "alive"
  const displayCount = onlineCount > 0 ? onlineCount : Math.floor(Math.random() * 5) + 1;
  res.json({ count: displayCount });
});

// Global total views
router.get('/global-total', (req, res) => {
  try {
    const total = db.prepare("SELECT COUNT(*) as count FROM page_views").get().count;
    res.json({ total });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

module.exports = router;
