const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DATA_DIR 
  ? path.join(process.env.DATA_DIR, 'database.db') 
  : path.join(__dirname, 'database.db');

let db = null;
let initPromise = null;

/**
 * Initializes the database. Returns a promise that resolves when the DB is ready.
 */
async function init() {
  console.log('[DB] init() called');
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      console.log('[DB] Initializing sql.js...');
      const SQL = await initSqlJs();
      console.log('[DB] sql.js engine loaded');

      if (fs.existsSync(DB_PATH)) {
        console.log('[DB] Loading existing database from:', DB_PATH);
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
      } else {
        console.log('[DB] Creating new in-memory database');
        db = new SQL.Database();
      }

      initializeSchema();
      console.log('[DB] Database initialized successfully');
      return db;
    } catch (err) {
      console.error('[DB] CRITICAL ERROR during initialization:', err);
      initPromise = null; // Allow retry
      throw err;
    }
  })();
  
  return initPromise;
}

function initializeSchema() {
  if (!db) throw new Error('Database not initialized');

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'editor',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      excerpt TEXT,
      image_url TEXT,
      author TEXT,
      category TEXT,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      video_url TEXT,
      thumbnail_url TEXT,
      author TEXT,
      category TEXT,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id INTEGER NOT NULL,
      content_type TEXT NOT NULL, -- 'article' or 'video'
      ip_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(content_id, content_type, ip_hash)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id INTEGER NOT NULL,
      content_type TEXT NOT NULL, -- 'article' or 'video'
      author_name TEXT NOT NULL,
      author_email TEXT,
      content TEXT NOT NULL,
      parent_id INTEGER,
      user_id INTEGER,
      status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS comment_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comment_id INTEGER NOT NULL,
      ip_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(comment_id, ip_hash)
    );
  `);

  const maxUsersResult = db.exec("SELECT value FROM settings WHERE key = 'max_users'");
  if (maxUsersResult.length === 0) {
    db.run("INSERT INTO settings (key, value) VALUES ('max_users', '3')");
  }

  // Schema migrations: users table
  try { db.run("ALTER TABLE users ADD COLUMN full_name TEXT"); } catch(e) {}
  try { db.run("ALTER TABLE users ADD COLUMN photo_url TEXT"); } catch(e) {}
  try { db.run("ALTER TABLE users ADD COLUMN links TEXT"); } catch(e) {}
  try { db.run("ALTER TABLE users ADD COLUMN show_on_contact INTEGER DEFAULT 0"); } catch(e) {}
  try { db.run("ALTER TABLE users ADD COLUMN role_name TEXT"); } catch(e) {}
  try { db.run("ALTER TABLE users ADD COLUMN bio TEXT"); } catch(e) {}

  // Schema migrations: comments table
  try { db.run("ALTER TABLE comments ADD COLUMN parent_id INTEGER"); } catch(e) {}
  try { db.run("ALTER TABLE comments ADD COLUMN user_id INTEGER"); } catch(e) {}
  try { db.run("ALTER TABLE comments ADD COLUMN author_email TEXT"); } catch(e) {}
  try { db.run("ALTER TABLE comments ADD COLUMN ip_hash TEXT"); } catch(e) {}
  try { db.run("ALTER TABLE comments ADD COLUMN edited INTEGER DEFAULT 0"); } catch(e) {}

  const adminResult = db.exec("SELECT id FROM users WHERE role = 'admin'");
  if (adminResult.length === 0 || adminResult[0].values.length === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.run("INSERT INTO users (username, full_name, password, role) VALUES ('admin', 'Administrador', ?, 'admin')", [hashedPassword]);
  }

  const ensureUser = (username, fullName) => {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (!existing) {
      const hashedPassword = bcrypt.hashSync('paf@2026', 10);
      db.run("INSERT INTO users (username, full_name, password, role) VALUES (?, ?, ?, 'editor')", [username, fullName, hashedPassword]);
    }
  };

  ensureUser('samuel', 'Samuca Chaves');
  ensureUser('ricardo', 'Ricardo de Freitas');
  
  db.run("UPDATE users SET show_on_contact = 1 WHERE username IN ('samuel', 'ricardo') AND show_on_contact = 0");

  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT,
    name TEXT,
    email TEXT,
    subject TEXT,
    content TEXT,
    status TEXT DEFAULT 'unread',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS supporters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    photo_url TEXT,
    tier TEXT DEFAULT 'Gold',
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS sponsors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    logo_url TEXT,
    tier TEXT DEFAULT 'Platinum',
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  try { db.run("ALTER TABLE supporters ADD COLUMN description TEXT"); } catch(e) {}
  try { db.run("ALTER TABLE supporters ADD COLUMN instagram TEXT"); } catch(e) {}
  try { db.run("ALTER TABLE supporters ADD COLUMN website TEXT"); } catch(e) {}
  try { db.run("ALTER TABLE sponsors ADD COLUMN description TEXT"); } catch(e) {}
  try { db.run("ALTER TABLE sponsors ADD COLUMN instagram TEXT"); } catch(e) {}
  try { db.run("ALTER TABLE sponsors ADD COLUMN website TEXT"); } catch(e) {}

  if (db.prepare('SELECT COUNT(*) as count FROM supporters').get().count === 0) {
    db.run("INSERT INTO supporters (name, tier) VALUES ('Cinemax BR', 'Gold'), ('Ana Julia', 'Silver')");
  }
  if (db.prepare('SELECT COUNT(*) as count FROM sponsors').get().count === 0) {
    db.run("INSERT INTO sponsors (name, tier) VALUES ('Warner Bros', 'Platinum'), ('Sony Pictures', 'Gold')");
  }

  if (db.prepare('SELECT COUNT(*) as count FROM articles').get().count === 0) {
    db.run(`INSERT INTO articles (title, content, excerpt, author, category, status, image_url) VALUES 
      ('Duna: Parte 2 - Uma Obra Prima do Sci-Fi', 
       '<p>Duna: Parte 2 consolida Denis Villeneuve como um dos maiores diretores da nossa geração. A escala técnica e a profundidade dos personagens elevam o material original.</p>',
       'Uma análise profunda da escala técnica e narrativa do novo épico de Denis Villeneuve.',
       'samuel', 'Crítica', 'published', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663377826788/ffgoPnblbbArTxFM.jpeg')`);
  }

  saveDatabase();
}

function saveDatabase() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('[DB] Failed to save database to disk:', err.message);
  }
}

function getAll(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);

  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row);
  }
  stmt.free();
  return results;
}

function getOne(sql, params = []) {
  const results = getAll(sql, params);
  return results[0] || null;
}

function run(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  saveDatabase();
  return { lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0]?.values[0][0] };
}

const dbWrapper = {
  init,
  prepare: (sql) => ({
    all: (...params) => getAll(sql, params),
    get: (...params) => getOne(sql, params),
    run: (...params) => run(sql, params)
  }),
  exec: (sql) => {
    if (!db) throw new Error('Database not initialized');
    db.run(sql);
    saveDatabase();
  }
};

module.exports = dbWrapper;