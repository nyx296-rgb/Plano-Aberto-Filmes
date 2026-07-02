const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db/database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'plano_aberto_default_secret_fallback_123!';
if (!process.env.JWT_SECRET) {
  console.warn('[WARNING] JWT_SECRET is not set. Using fallback secret.');
}

// ── Login rate limiting ───────────────────────────────────────────────────────
const loginAttempts = new Map();
const MAX_ATTEMPTS   = 6;
const WINDOW_MS      = 15 * 60 * 1000; // 15 minutes

function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1')
    .split(',')[0].trim();
}

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry) return { blocked: false };
  if (now - entry.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(ip);
    return { blocked: false };
  }
  if (entry.count >= MAX_ATTEMPTS) {
    const remainingMs = WINDOW_MS - (now - entry.firstAttempt);
    return { blocked: true, remainingSec: Math.ceil(remainingMs / 1000) };
  }
  return { blocked: false };
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    entry.count += 1;
  }
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}


router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip);

    if (rateCheck.blocked) {
      const mins = Math.ceil(rateCheck.remainingSec / 60);
      return res.status(429).json({
        error: `Muitas tentativas de login. Tente novamente em ${mins} minuto${mins !== 1 ? 's' : ''}.`,
        retryAfterSec: rateCheck.remainingSec
      });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      recordFailedAttempt(ip);
      const entry = loginAttempts.get(ip);
      const remaining = MAX_ATTEMPTS - (entry ? entry.count : 0);
      return res.status(401).json({
        error: 'Usuário ou senha incorretos.',
        attemptsRemaining: Math.max(remaining, 0)
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      recordFailedAttempt(ip);
      const entry = loginAttempts.get(ip);
      const remaining = MAX_ATTEMPTS - (entry ? entry.count : 0);
      return res.status(401).json({
        error: 'Usuário ou senha incorretos.',
        attemptsRemaining: Math.max(remaining, 0)
      });
    }

    clearAttempts(ip);

    const token = jwt.sign(
      { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Internal server error during login', stack: err.stack });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, full_name, role FROM users WHERE id = ?').get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;