// ── Load .env before anything else ───────────────────────────────────────────
const fs_env = require('fs');
const path_env = require('path');
const envPath = path_env.join(__dirname, '.env');
if (fs_env.existsSync(envPath)) {
  fs_env.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  });
}

const express = require('express');

const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('./db/database');

const authRoutes = require('./routes/auth');
const { authenticateToken } = authRoutes;
const userRoutes = require('./routes/users');
const contentRoutes = require('./routes/content');

const app = express();
const PORT = process.env.PORT || 8080;
const IP = process.env.IP || '0.0.0.0';

// ── Security: warn if JWT_SECRET is not set ──────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.warn('[SECURITY WARNING] JWT_SECRET env var not set. Authentication will fail. Set it in .env!');
}

let dbInitError = null;

// ── CORS ────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : [];
app.use(cors({
  origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : true,
  credentials: true
}));

app.use(express.json({ limit: '2mb' }));

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Global Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const safeUrl = req.url.split('?')[0];
    console.log(`[REQUEST] ${req.method} ${safeUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Analytics Middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.includes('.')) return next();
  
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const ip_hash = crypto.createHash('md5').update(ip).digest('hex');
  const user_agent = req.headers['user-agent'] || 'unknown';
  
  try {
    db.prepare('INSERT INTO page_views (path, ip_hash, user_agent) VALUES (?, ?, ?)').run(req.path || '/', ip_hash, user_agent);
  } catch (e) {
    console.error('Analytics error:', e.message);
  }
  next();
});

app.use(express.static(path.join(process.cwd(), 'public')));

// Normalize relative API requests (e.g. from /videos/api/... -> /api/...)
app.use((req, res, next) => {
  const match = req.url.match(/^(?:\/.*)?(\/api\/.*)$/);
  if (match && !req.url.startsWith('/api/')) {
    req.url = match[1];
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/stats', require('./routes/stats'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/partners', require('./routes/partners'));

// Social Links API (settings-based)
app.get('/api/settings/social-links', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'social_links'").get();
  if (row) {
    try { res.json(JSON.parse(row.value)); } catch(e) { res.json([]); }
  } else {
    res.json([
      { platform: 'Instagram', handle: '@planoabertofilmes', url: 'https://instagram.com/planoabertofilmes', icon: '📸' },
      { platform: 'YouTube', handle: 'Samuca SC Filmes', url: 'https://youtube.com/@samucascfilmes', icon: '🎬' },
      { platform: 'Email', handle: 'contato@planoaberto.com', url: 'mailto:contato@planoaberto.com', icon: '✉️' }
    ]);
  }
});

app.put('/api/settings/social-links', authenticateToken, (req, res) => {
  const data = JSON.stringify(req.body);
  const existing = db.prepare("SELECT key FROM settings WHERE key = 'social_links'").get();
  if (existing) {
    db.prepare("UPDATE settings SET value = ? WHERE key = 'social_links'").run(data);
  } else {
    db.prepare("INSERT INTO settings (key, value) VALUES ('social_links', ?)").run(data);
  }
  res.json({ success: true });
});

app.use('/api/trpc', require('./routes/trpc'));

// Image Uploads — requires auth + extension whitelist
const multer = require('multer');

const dataDir = process.env.DATA_DIR;
const uploadsTmpDir = dataDir ? path.join(dataDir, 'uploads_tmp') : path.join(process.cwd(), 'uploads_tmp');
const uploadsDir = dataDir ? path.join(dataDir, 'uploads') : path.join(process.cwd(), 'public', 'uploads');

const upload = multer({ dest: uploadsTmpDir, limits: { fileSize: 8 * 1024 * 1024 } });

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(uploadsTmpDir)) {
  fs.mkdirSync(uploadsTmpDir, { recursive: true });
}

// Quando usamos um DATA_DIR externo, temos de servir esta pasta com as imagens.
// Quando é na pasta public/uploads (localmente), o express.static('public') já o faz, 
// mas não faz mal termos isto também para fallback, sendo que se houver o DATA_DIR servimos daqui
if (dataDir) {
  app.use('/uploads', express.static(uploadsDir));
}

const ALLOWED_EXTS  = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!ALLOWED_EXTS.has(ext) || !ALLOWED_MIMES.has(req.file.mimetype)) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Tipo de arquivo não permitido. Use JPG, PNG, GIF ou WebP.' });
  }

  const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
  const targetPath = path.join(uploadsDir, filename);

  try {
    fs.renameSync(req.file.path, targetPath);
    res.json({ url: `/uploads/${filename}` });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao mover arquivo' });
  }
});

// Admin Route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'admin.html'));
});

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'admin.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

app.get('/patrocinadores', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'patrocinadores.html'));
});

app.get('/apoiadores', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'apoiadores.html'));
});

app.get('/apoie', (req, res) => {
  res.redirect('/patrocinadores');
});

app.get(['/supporters', '/sponsors'], (req, res) => {
  res.redirect('/patrocinadores');
});

app.get(['/news', '/contact', '/faq', '/questions'], (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// SSR Open Graph for news/articles
app.get(['/articles/:slug', '/news/:slug'], (req, res) => {
  const slug = req.params.slug;
  const indexPath = path.join(process.cwd(), 'public', 'index.html');
  
  if (!fs.existsSync(indexPath)) return res.status(404).send('Not Found');
  
  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  let item = null;
  let ogImage = '/logo.png';

  const slugify = (text) => String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/-+$/, '').replace(/^-+/, '');

  if (!isNaN(slug) && slug !== '') {
    item = db.prepare('SELECT * FROM articles WHERE id = ?').get(slug);
  } else {
    const all = db.prepare('SELECT * FROM articles').all();
    item = all.find(a => slugify(a.title) === slug || slugify(a.title).replace(/-/g, '') === slug.replace(/-/g, ''));
  }

  let ogTags = '';
  if (item) {
    if (item.image_url) ogImage = item.image_url;
    const desc = (item.excerpt || item.title || '').substring(0, 160);
    ogTags = `
  <meta property="og:title" content="${escapeHtml(item.title)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:url" content="${req.protocol}://${req.get('host')}${req.originalUrl}" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(item.title)}" />
  <meta name="twitter:description" content="${escapeHtml(desc)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />`;
  }

  const patched = indexHtml.replace('</head>', `${ogTags}\n</head>`);
  res.send(patched);
});

// SSR Open Graph for videos
app.get('/videos/:slug', (req, res) => {
  const slug = req.params.slug;
  const indexPath = path.join(process.cwd(), 'public', 'index.html');
  
  if (!fs.existsSync(indexPath)) return res.status(404).send('Not Found');
  
  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  let item = null;
  let ogImage = '/logo.png';

  const slugify = (text) => String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/-+$/, '').replace(/^-+/, '');

  if (!isNaN(slug) && slug !== '') {
    item = db.prepare('SELECT * FROM videos WHERE id = ?').get(slug);
  } else {
    const all = db.prepare('SELECT * FROM videos').all();
    item = all.find(v => slugify(v.title) === slug);
  }

  let ogTags = '';
  if (item) {
    if (item.thumbnail_url) ogImage = item.thumbnail_url;
    const desc = (item.description ? item.description.replace(/<[^>]+>/g, '') : item.title || '').substring(0, 160);
    ogTags = `
  <meta property="og:title" content="${escapeHtml(item.title)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:url" content="${req.protocol}://${req.get('host')}${req.originalUrl}" />
  <meta property="og:type" content="video.other" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(item.title)}" />
  <meta name="twitter:description" content="${escapeHtml(desc)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />`;
  }

  const patched = indexHtml.replace('</head>', `${ogTags}\n</head>`);
  res.send(patched);
});


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA Fallback: Only send index.html if it's NOT an asset request
app.get('*', (req, res) => {
  // If it's a request for a file with an extension that wasn't found by express.static, 
  // return a 404 instead of index.html to avoid MIME type errors (like the CSS error).
  if (req.path.includes('.') && !req.path.endsWith('.html')) {
    return res.status(404).send('Not Found');
  }
  
  const indexPath = path.join(process.cwd(), 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not found. Please build the app.');
  }
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.stack);
  res.status(500).json({ 
    error: err.message || 'Internal server error',
    stack: err.stack
  });
});

// Start Server after DB is ready (or even if it fails, for debugging)
db.init().then(() => {
  app.listen(PORT, IP, () => {
    console.log(`Plano Aberto Filmes server running on http://${IP}:${PORT}`);
    console.log(`API: http://${IP}:${PORT}/api`);
  });
}).catch(err => {
  dbInitError = err;
  console.error('FAILED to initialize database. Starting in debug mode.');
  app.listen(PORT, IP, () => {
    console.log(`ERROR: Server running with DB failure on http://${IP}:${PORT}`);
  });
});

module.exports = app;